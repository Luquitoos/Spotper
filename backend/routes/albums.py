from flask import request, jsonify
from routes import albums_bp
from config.database import get_conexao

@albums_bp.route('', methods=['GET'])
def listar_albuns():
    # Req (i): Lista álbuns com código, descrição, gravadora, preço, datas, tipo_midia, qtd_unidades
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT a.cod_album, a.nome, a.descricao, g.nome AS gravadora, a.cod_gravadora,
               a.tipo_midia, a.preco_compra, a.data_compra, a.data_gravacao, 
               a.tipo_compra, a.qtd_unidades,
               (SELECT COUNT(*) FROM FAIXA f WHERE f.cod_album = a.cod_album) AS qtd_faixas
        FROM ALBUM a
        JOIN GRAVADORA g ON a.cod_gravadora = g.cod_gravadora
        ORDER BY a.nome
    """)
    rows = cursor.fetchall()
    cursor.close()
    albuns = []
    for row in rows:
        album = {
            'cod_album': row[0],
            'nome': row[1],
            'descricao': row[2],
            'gravadora': row[3],
            'cod_gravadora': row[4],
            'tipo_midia': row[5],
            'preco_compra': float(row[6]) if row[6] else None,
            'data_compra': str(row[7]) if row[7] else None,
            'data_gravacao': str(row[8]) if row[8] else None,
            'tipo_compra': row[9],
            'qtd_unidades': row[10],
            'qtd_faixas': row[11],
            'compositor_period_ids': [],
            'compositor_ids': [],
            'interprete_ids': []
        }
        cursor2 = conexao.cursor()
        cursor2.execute("""
            SELECT DISTINCT c.cod_periodo, c.cod_compositor
            FROM FAIXA_COMPOSITOR fc
            JOIN COMPOSITOR c ON fc.cod_compositor = c.cod_compositor
            WHERE fc.cod_album = ?
        """, (row[0],))
        for comp_row in cursor2.fetchall():
            if comp_row[0] not in album['compositor_period_ids']:
                album['compositor_period_ids'].append(comp_row[0])
            if comp_row[1] not in album['compositor_ids']:
                album['compositor_ids'].append(comp_row[1])
        cursor2.close()
        cursor3 = conexao.cursor()
        cursor3.execute("""
            SELECT DISTINCT fi.cod_interprete
            FROM FAIXA_INTERPRETE fi
            WHERE fi.cod_album = ?
        """, (row[0],))
        for interp_row in cursor3.fetchall():
            album['interprete_ids'].append(interp_row[0])
        cursor3.close()
        albuns.append(album)
    conexao.close()
    return jsonify(albuns)

@albums_bp.route('/<int:cod_album>', methods=['GET'])
def obter_album(cod_album):
    # Obtém um álbum específico
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT a.cod_album, a.nome, a.descricao, g.nome AS gravadora, a.cod_gravadora,
               a.tipo_midia, a.preco_compra, a.data_compra, a.data_gravacao, 
               a.tipo_compra, a.qtd_unidades,
               (SELECT COUNT(*) FROM FAIXA f WHERE f.cod_album = a.cod_album) AS qtd_faixas
        FROM ALBUM a
        JOIN GRAVADORA g ON a.cod_gravadora = g.cod_gravadora
        WHERE a.cod_album = ?
    """, (cod_album,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': 'Álbum não encontrado'}), 404
    album = {
        'cod_album': row[0],
        'nome': row[1],
        'descricao': row[2],
        'gravadora': row[3],
        'cod_gravadora': row[4],
        'tipo_midia': row[5],
        'preco_compra': float(row[6]) if row[6] else None,
        'data_compra': str(row[7]) if row[7] else None,
        'data_gravacao': str(row[8]) if row[8] else None,
        'tipo_compra': row[9],
        'qtd_unidades': row[10],
        'qtd_faixas': row[11]
    }
    cursor.close()
    conexao.close()
    return jsonify(album)

@albums_bp.route('', methods=['POST'])
def criar_album():
    # Req (i): Cria álbum com código, descrição, gravadora, preço, datas, tipo_midia, qtd_unidades
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO ALBUM (nome, descricao, cod_gravadora, preco_compra, data_compra,
                              data_gravacao, tipo_compra, tipo_midia, qtd_unidades)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dados['nome'],
            dados['descricao'],
            dados['cod_gravadora'],
            dados['preco_compra'],
            dados['data_compra'],
            dados['data_gravacao'],
            dados['tipo_compra'],
            dados['tipo_midia'],
            dados.get('qtd_unidades', 1)
        ))
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        cod_album = int(row[0]) if row and row[0] else None
        if cod_album is None:
            conexao.rollback()
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Falha ao obter ID do álbum criado'}), 500
        faixas = dados.get('faixas', [])
        tipo_midia = dados['tipo_midia']
        for faixa in faixas:
            cod_tipo_composicao = faixa.get('cod_tipo_composicao')
            tipo_composicao_texto = faixa.get('tipo_composicao_texto')
            if not cod_tipo_composicao and tipo_composicao_texto:
                cursor.execute("""
                    SELECT cod_tipo_composicao FROM TIPO_COMPOSICAO WHERE descricao = ?
                """, (tipo_composicao_texto,))
                existing = cursor.fetchone()
                if existing:
                    cod_tipo_composicao = existing[0]
                else:
                    cursor.execute("""
                        INSERT INTO TIPO_COMPOSICAO (descricao) VALUES (?)
                    """, (tipo_composicao_texto,))
                    cursor.execute("SELECT @@IDENTITY")
                    tipo_row = cursor.fetchone()
                    cod_tipo_composicao = int(tipo_row[0]) if tipo_row and tipo_row[0] else None
            if not cod_tipo_composicao:
                conexao.rollback()
                cursor.close()
                conexao.close()
                return jsonify({'error': True, 'message': 'Tipo de composição é obrigatório para cada faixa'}), 400
            tipo_gravacao = faixa.get('tipo_gravacao')
            tipo_midia_check = tipo_midia.upper() if tipo_midia else ''
            if tipo_midia_check in ('VINIL', 'DOWNLOAD'):
                # Req (iii.b): VINIL/DOWNLOAD não podem ter tipo_gravacao
                tipo_gravacao = None  
            elif tipo_midia_check == 'CD' and not tipo_gravacao:
                # Req (iii.b): CD exige tipo_gravacao ADD ou DDD
                conexao.rollback()
                cursor.close()
                conexao.close()
                return jsonify({'error': True, 'message': 'Faixas de CD devem ter tipo de gravação (ADD ou DDD)'}), 400
            cursor.execute("""
                INSERT INTO FAIXA (cod_album, numero_unidade, numero_faixa, descricao, 
                                   cod_tipo_composicao, tempo_execucao, tipo_gravacao)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                cod_album,
                faixa.get('numero_unidade', 1),
                faixa.get('numero_faixa', 1),
                faixa['descricao'],
                cod_tipo_composicao,
                faixa['tempo_execucao'],
                tipo_gravacao
            ))
            for cod_compositor in faixa.get('compositores', []):
                tipo_midia_upper = tipo_midia.upper() if tipo_midia else ''
                if tipo_midia_upper in ('VINIL', 'DOWNLOAD'):
                    cursor.execute("""
                        SELECT p.descricao 
                        FROM COMPOSITOR c 
                        JOIN PERIODO_MUSICAL p ON c.cod_periodo = p.cod_periodo 
                        WHERE c.cod_compositor = ? AND UPPER(p.descricao) LIKE '%BARROCO%'
                    """, (cod_compositor,))
                    barroco_check = cursor.fetchone()
                    if barroco_check:
                        # Restrição (a): Barroco exige DDD - VINIL/DOWNLOAD não suportam
                        conexao.rollback()
                        cursor.close()
                        conexao.close()
                        return jsonify({
                            'error': True, 
                            'message': f'Compositores do período Barroco não podem estar em álbuns VINIL/DOWNLOAD. Barroco exige gravação DDD, que não é suportada por {tipo_midia}.'
                        }), 400
                cursor.execute("""
                    INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
                    VALUES (?, ?, ?, ?)
                """, (cod_album, faixa.get('numero_unidade', 1), faixa.get('numero_faixa', 1), cod_compositor))
            for cod_interprete in faixa.get('interpretes', []):
                cursor.execute("""
                    INSERT INTO FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
                    VALUES (?, ?, ?, ?)
                """, (cod_album, faixa.get('numero_unidade', 1), faixa.get('numero_faixa', 1), cod_interprete))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'cod_album': cod_album, 'faixas_inseridas': len(faixas)}), 201
    except Exception as e:
        try:
            conexao.rollback()
        except:
            pass
        try:
            cursor.close()
            conexao.close()
        except:
            pass
        return jsonify({'error': True, 'message': str(e)}), 400

@albums_bp.route('/<int:cod_album>', methods=['PUT'])
def atualizar_album(cod_album):
    # Atualiza um álbum
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            UPDATE ALBUM 
            SET nome = ?, descricao = ?, cod_gravadora = ?, preco_compra = ?,
                data_compra = ?, data_gravacao = ?, tipo_compra = ?, qtd_unidades = ?
            WHERE cod_album = ?
        """, (
            dados.get('nome'),
            dados.get('descricao'),
            dados.get('cod_gravadora'),
            dados.get('preco_compra'),
            dados.get('data_compra'),
            dados.get('data_gravacao'),
            dados.get('tipo_compra'),
            dados.get('qtd_unidades', 1),
            cod_album
        ))
        if cursor.rowcount == 0:
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Álbum não encontrado'}), 404
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Álbum atualizado'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@albums_bp.route('/<int:cod_album>', methods=['DELETE'])
def deletar_album(cod_album):
    # Restrição (c): Ao remover álbum, faixas são removidas via CASCADE no banco
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("DELETE FROM ALBUM WHERE cod_album = ?", (cod_album,))
        if cursor.rowcount == 0:
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Álbum não encontrado'}), 404
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Álbum removido'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@albums_bp.route('/<int:cod_album>/tracks', methods=['GET'])
def listar_faixas_album(cod_album):
    # Req (ii): Lista faixas do álbum com compositores e intérpretes
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT f.cod_album, f.numero_unidade, f.numero_faixa, f.descricao,
               f.cod_tipo_composicao, tc.descricao AS tipo_composicao,
               f.tempo_execucao, f.tipo_gravacao
        FROM FAIXA f
        JOIN TIPO_COMPOSICAO tc ON f.cod_tipo_composicao = tc.cod_tipo_composicao
        WHERE f.cod_album = ?
        ORDER BY f.numero_unidade, f.numero_faixa
    """, (cod_album,))
    rows = cursor.fetchall()
    cursor.close()
    faixas = []
    for row in rows:
        faixa = {
            'cod_album': row[0],
            'numero_unidade': row[1],
            'numero_faixa': row[2],
            'descricao': row[3],
            'cod_tipo_composicao': row[4],
            'tipo_composicao': row[5],
            'tempo_execucao': row[6],
            'tipo_gravacao': row[7],
            'compositores': [],
            'interpretes': []
        }
        cursor2 = conexao.cursor()
        cursor2.execute("""
            SELECT c.cod_compositor, c.nome 
            FROM FAIXA_COMPOSITOR fc
            JOIN COMPOSITOR c ON fc.cod_compositor = c.cod_compositor
            WHERE fc.cod_album = ? AND fc.numero_unidade = ? AND fc.numero_faixa = ?
        """, (row[0], row[1], row[2]))
        faixa['compositores'] = [{'cod_compositor': c[0], 'nome': c[1]} for c in cursor2.fetchall()]
        cursor2.close()
        cursor3 = conexao.cursor()
        cursor3.execute("""
            SELECT i.cod_interprete, i.nome 
            FROM FAIXA_INTERPRETE fi
            JOIN INTERPRETE i ON fi.cod_interprete = i.cod_interprete
            WHERE fi.cod_album = ? AND fi.numero_unidade = ? AND fi.numero_faixa = ?
        """, (row[0], row[1], row[2]))
        faixa['interpretes'] = [{'cod_interprete': i[0], 'nome': i[1]} for i in cursor3.fetchall()]
        cursor3.close()
        faixas.append(faixa)
    conexao.close()
    return jsonify(faixas)
