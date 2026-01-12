# backend/routes/interpreters.py
# Rotas para Intérpretes

from flask import request, jsonify
from routes import interpreters_bp
from config.database import get_conexao


@interpreters_bp.route('', methods=['GET'])
def listar_interpretes():
    """Lista todos os intérpretes."""
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
    """Cria um novo intérprete."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("INSERT INTO INTERPRETE (nome, tipo) VALUES (?, ?)", 
                      (dados['nome'], dados['tipo']))
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_interprete = cursor.fetchone()[0]
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_interprete': int(cod_interprete)}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
