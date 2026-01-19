from flask import request, jsonify
from routes import composition_types_bp
from config.database import get_conexao
@composition_types_bp.route('', methods=['GET'])

def listar_tipos_composicao():
    # Req (iv): Lista tipos de composição com código e descrição (sinfonia, ópera, etc)
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
    # Req (iv): Cria tipo de composição com descrição
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO TIPO_COMPOSICAO (descricao) 
            VALUES (?)
        """, (dados['descricao'],))
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        cod_tipo = int(row[0]) if row and row[0] else None
        conexao.commit()
        cursor.close()
        conexao.close()
        if cod_tipo is None:
            return jsonify({'error': True, 'message': 'Falha ao obter ID do tipo de composição criado'}), 500
        return jsonify({'success': True, 'cod_tipo_composicao': cod_tipo}), 201
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
