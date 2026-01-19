from flask import request, jsonify
from routes import tracks_bp
from config.database import get_conexao

@tracks_bp.route('', methods=['GET'])
def listar_faixas():
    # Req (iii): Lista faixas com número, descrição, tipo composição, tempo, tipo gravação
    tipo_midia = request.args.get('tipo_midia')
    cod_periodo = request.args.get('cod_periodo')
    cod_compositor = request.args.get('cod_compositor')
    cod_interprete = request.args.get('cod_interprete')
    conexao = get_conexao()
    cursor = conexao.cursor()
    query = """
        SELECT DISTINCT f.cod_album, f.numero_unidade, f.numero_faixa, f.descricao,
               f.cod_tipo_composicao, tc.descricao AS tipo_composicao,
               f.tempo_execucao, f.tipo_gravacao,
               a.nome AS nome_album, a.tipo_midia
        FROM FAIXA f
        JOIN TIPO_COMPOSICAO tc ON f.cod_tipo_composicao = tc.cod_tipo_composicao
        JOIN ALBUM a ON f.cod_album = a.cod_album
    """
    if cod_periodo or cod_compositor:
        query += """
        JOIN FAIXA_COMPOSITOR fc ON f.cod_album = fc.cod_album 
             AND f.numero_unidade = fc.numero_unidade 
             AND f.numero_faixa = fc.numero_faixa
        JOIN COMPOSITOR c ON fc.cod_compositor = c.cod_compositor
        """
    if cod_interprete:
        query += """
        JOIN FAIXA_INTERPRETE fi ON f.cod_album = fi.cod_album 
             AND f.numero_unidade = fi.numero_unidade 
             AND f.numero_faixa = fi.numero_faixa
        """
    conditions = []
    params = []
    if tipo_midia and tipo_midia != 'ALL':
        conditions.append("a.tipo_midia = ?")
        params.append(tipo_midia)
    if cod_periodo:
        conditions.append("c.cod_periodo = ?")
        params.append(int(cod_periodo))
    if cod_compositor:
        conditions.append("fc.cod_compositor = ?")
        params.append(int(cod_compositor))
    if cod_interprete:
        conditions.append("fi.cod_interprete = ?")
        params.append(int(cod_interprete))
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY a.nome, f.numero_unidade, f.numero_faixa"
    cursor.execute(query, params)
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
            'nome_album': row[8],
            'tipo_midia': row[9],
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

@tracks_bp.route('', methods=['POST'])
def criar_faixa():
    # Req (iii.a): Cria faixa com número, descrição, tipo composição, tempo, tipo gravação
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO FAIXA (cod_album, numero_unidade, numero_faixa, descricao,
                              cod_tipo_composicao, tempo_execucao, tipo_gravacao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            dados['cod_album'],
            dados['numero_unidade'],
            dados['numero_faixa'],
            dados['descricao'],
            dados['cod_tipo_composicao'],
            dados['tempo_execucao'],
            dados.get('tipo_gravacao')
        ))
        # Req (iii.c): Associa múltiplos compositores à faixa
        for cod_compositor in dados.get('compositores', []):
            cursor.execute("""
                INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
                VALUES (?, ?, ?, ?)
            """, (dados['cod_album'], dados['numero_unidade'], dados['numero_faixa'], cod_compositor))
        # Req (iii.c): Associa múltiplos intérpretes à faixa
        for cod_interprete in dados.get('interpretes', []):
            cursor.execute("""
                INSERT INTO FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
                VALUES (?, ?, ?, ?)
            """, (dados['cod_album'], dados['numero_unidade'], dados['numero_faixa'], cod_interprete))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Faixa criada'}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@tracks_bp.route('/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>', methods=['PUT'])
def atualizar_faixa(cod_album, numero_unidade, numero_faixa):
    # Atualiza uma faixa
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            UPDATE FAIXA
            SET descricao = ?, cod_tipo_composicao = ?, tempo_execucao = ?, tipo_gravacao = ?
            WHERE cod_album = ? AND numero_unidade = ? AND numero_faixa = ?
        """, (
            dados.get('descricao'),
            dados.get('cod_tipo_composicao'),
            dados.get('tempo_execucao'),
            dados.get('tipo_gravacao'),
            cod_album, numero_unidade, numero_faixa
        ))
        if cursor.rowcount == 0:
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Faixa não encontrada'}), 404
        if 'compositores' in dados:
            cursor.execute("""
                DELETE FROM FAIXA_COMPOSITOR 
                WHERE cod_album = ? AND numero_unidade = ? AND numero_faixa = ?
            """, (cod_album, numero_unidade, numero_faixa))
            for cod_compositor in dados['compositores']:
                cursor.execute("""
                    INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
                    VALUES (?, ?, ?, ?)
                """, (cod_album, numero_unidade, numero_faixa, cod_compositor))
        if 'interpretes' in dados:
            cursor.execute("""
                DELETE FROM FAIXA_INTERPRETE 
                WHERE cod_album = ? AND numero_unidade = ? AND numero_faixa = ?
            """, (cod_album, numero_unidade, numero_faixa))
            for cod_interprete in dados['interpretes']:
                cursor.execute("""
                    INSERT INTO FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
                    VALUES (?, ?, ?, ?)
                """, (cod_album, numero_unidade, numero_faixa, cod_interprete))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Faixa atualizada'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@tracks_bp.route('/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>', methods=['DELETE'])
def deletar_faixa(cod_album, numero_unidade, numero_faixa):
    # Deleta uma faixa
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            DELETE FROM FAIXA 
            WHERE cod_album = ? AND numero_unidade = ? AND numero_faixa = ?
        """, (cod_album, numero_unidade, numero_faixa))
        if cursor.rowcount == 0:
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Faixa não encontrada'}), 404
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Faixa removida'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@tracks_bp.route('/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>/composers', methods=['POST'])
def associar_compositor_faixa(cod_album, numero_unidade, numero_faixa):
    # Req (iii.c): Associa compositor a faixa (N:N)
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
            VALUES (?, ?, ?, ?)
        """, (cod_album, numero_unidade, numero_faixa, dados['cod_compositor']))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Compositor associado'}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@tracks_bp.route('/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>/interpreters', methods=['POST'])
def associar_interprete_faixa(cod_album, numero_unidade, numero_faixa):
    # Req (iii.c): Associa intérprete a faixa (N:N)
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
            VALUES (?, ?, ?, ?)
        """, (cod_album, numero_unidade, numero_faixa, dados['cod_interprete']))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Intérprete associado'}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
