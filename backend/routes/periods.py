# backend/routes/periods.py
# Rotas para Períodos Musicais

from flask import request, jsonify
from routes import periods_bp
from config.database import get_conexao


@periods_bp.route('', methods=['GET'])
def listar_periodos():
    """Lista todos os períodos musicais."""
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
    """Cria um novo período musical."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO PERIODO_MUSICAL (descricao, ano_inicio, ano_fim) 
            VALUES (?, ?, ?)
        """, (dados['descricao'], dados['ano_inicio'], dados['ano_fim']))
        
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_periodo = cursor.fetchone()[0]
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_periodo': int(cod_periodo)}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
