from flask import request, jsonify
from routes import interpreters_bp
from config.database import get_conexao

@interpreters_bp.route('', methods=['GET'])
def listar_interpretes():
    # Req (v): Lista intérpretes com código, nome e tipo (orquestra, trio, etc)
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT cod_interprete, nome, tipo FROM INTERPRETE ORDER BY nome")
    interpretes = []
    row = cursor.fetchone()
    while row:
        interpretes.append({
            'cod_interprete': row[0],
            'nome': row[1],
            'tipo': row[2]
        })
        row = cursor.fetchone()
    cursor.close()
    conexao.close()
    return jsonify(interpretes)

@interpreters_bp.route('', methods=['POST'])
def criar_interprete():
    # Req (v): Cria intérprete com nome e tipo (orquestra, trio, quarteto, etc)
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO INTERPRETE (nome, tipo) 
            VALUES (?, ?)
        """, (dados['nome'], dados['tipo']))
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        cod_interprete = int(row[0]) if row and row[0] else None
        conexao.commit()
        cursor.close()
        conexao.close()
        if cod_interprete is None:
            return jsonify({'error': True, 'message': 'Falha ao obter ID do intérprete criado'}), 500
        return jsonify({'success': True, 'cod_interprete': cod_interprete}), 201
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

@interpreters_bp.route('/<int:cod_interprete>', methods=['PUT'])
def atualizar_interprete(cod_interprete):
    # Atualiza um intérprete existente
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            UPDATE INTERPRETE 
            SET nome = ?, tipo = ?
            WHERE cod_interprete = ?
        """, (
            dados['nome'], 
            dados.get('tipo'),
            cod_interprete
        ))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'cod_interprete': cod_interprete})
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
