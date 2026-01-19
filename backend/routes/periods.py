from flask import request, jsonify
from routes import periods_bp
from config.database import get_conexao

@periods_bp.route('', methods=['GET'])
def listar_periodos():
    # Req (vii): Lista períodos musicais com código, descrição e intervalo de tempo
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT cod_periodo, descricao, ano_inicio, ano_fim FROM PERIODO_MUSICAL ORDER BY ano_inicio")
    periodos = []
    row = cursor.fetchone()
    while row:
        periodos.append({
            'cod_periodo': row[0],
            'descricao': row[1],
            'ano_inicio': row[2],
            'ano_fim': row[3]
        })
        row = cursor.fetchone()
    cursor.close()
    conexao.close()
    return jsonify(periodos)

@periods_bp.route('', methods=['POST'])
def criar_periodo():
    # Req (vii): Cria período com descrição e intervalo de tempo (ano_inicio, ano_fim)
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO PERIODO_MUSICAL (descricao, ano_inicio, ano_fim) 
            VALUES (?, ?, ?)
        """, (dados['descricao'], dados['ano_inicio'], dados['ano_fim']))
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        cod_periodo = int(row[0]) if row and row[0] else None
        conexao.commit()
        cursor.close()
        conexao.close()
        if cod_periodo is None:
            return jsonify({'error': True, 'message': 'Falha ao obter ID do período criado'}), 500
        return jsonify({'success': True, 'cod_periodo': cod_periodo}), 201
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
