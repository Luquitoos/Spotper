# backend/routes/composition_types.py
# Rotas para Tipos de Composição

from flask import request, jsonify
from routes import composition_types_bp
from config.database import get_conexao


@composition_types_bp.route('', methods=['GET'])
def listar_tipos_composicao():
    """Lista todos os tipos de composição."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT cod_tipo_composicao, descricao FROM TIPO_COMPOSICAO ORDER BY descricao")
    
    tipos = []
    row = cursor.fetchone()
    while row:
        tipos.append({
            'cod_tipo_composicao': row[0],
            'descricao': row[1]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(tipos)


@composition_types_bp.route('', methods=['POST'])
def criar_tipo_composicao():
    """Cria um novo tipo de composição."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("INSERT INTO TIPO_COMPOSICAO (descricao) VALUES (?)", (dados['descricao'],))
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_tipo = cursor.fetchone()[0]
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_tipo_composicao': int(cod_tipo)}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
