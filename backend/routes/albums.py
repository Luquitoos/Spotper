# backend/routes/albums.py
# Rotas para Álbuns

from flask import request, jsonify
from routes import albums_bp
from config.database import get_conexao


@albums_bp.route('', methods=['GET'])
def listar_albuns():
    """Lista todos os álbuns."""
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
    
    albuns = []
    row = cursor.fetchone()
    while row:
        albuns.append({
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
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(albuns)


@albums_bp.route('/<int:cod_album>', methods=['GET'])
def obter_album(cod_album):
    """Obtém um álbum específico."""
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
    """Cria um novo álbum."""
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
        
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_album = cursor.fetchone()[0]
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_album': int(cod_album)}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400


@albums_bp.route('/<int:cod_album>', methods=['PUT'])
def atualizar_album(cod_album):
    """Atualiza um álbum."""
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
    """Deleta um álbum."""
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
    """Lista todas as faixas de um álbum."""
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
    
    faixas = []
    row = cursor.fetchone()
    while row:
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
        
        # Buscar compositores
        cursor2 = conexao.cursor()
        cursor2.execute("""
            SELECT c.cod_compositor, c.nome 
            FROM FAIXA_COMPOSITOR fc
            JOIN COMPOSITOR c ON fc.cod_compositor = c.cod_compositor
            WHERE fc.cod_album = ? AND fc.numero_unidade = ? AND fc.numero_faixa = ?
        """, (row[0], row[1], row[2]))
        comp = cursor2.fetchone()
        while comp:
            faixa['compositores'].append({'cod_compositor': comp[0], 'nome': comp[1]})
            comp = cursor2.fetchone()
        cursor2.close()
        
        # Buscar intérpretes
        cursor3 = conexao.cursor()
        cursor3.execute("""
            SELECT i.cod_interprete, i.nome 
            FROM FAIXA_INTERPRETE fi
            JOIN INTERPRETE i ON fi.cod_interprete = i.cod_interprete
            WHERE fi.cod_album = ? AND fi.numero_unidade = ? AND fi.numero_faixa = ?
        """, (row[0], row[1], row[2]))
        interp = cursor3.fetchone()
        while interp:
            faixa['interpretes'].append({'cod_interprete': interp[0], 'nome': interp[1]})
            interp = cursor3.fetchone()
        cursor3.close()
        
        faixas.append(faixa)
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(faixas)
