# backend/routes/labels.py
# Rotas para Gravadoras

from flask import request, jsonify
from routes import labels_bp
from config.database import get_conexao


@labels_bp.route('', methods=['GET'])
def listar_gravadoras():
    """Lista todas as gravadoras."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT cod_gravadora, nome, endereco, homepage FROM GRAVADORA ORDER BY nome")
    
    gravadoras = []
    row = cursor.fetchone()
    while row:
        gravadoras.append({
            'cod_gravadora': row[0],
            'nome': row[1],
            'endereco': row[2],
            'homepage': row[3]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(gravadoras)


@labels_bp.route('/<int:cod_gravadora>', methods=['GET'])
def obter_gravadora(cod_gravadora):
    """Obtém uma gravadora com seus telefones."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    cursor.execute("""
        SELECT cod_gravadora, nome, endereco, homepage 
        FROM GRAVADORA WHERE cod_gravadora = ?
    """, (cod_gravadora,))
    row = cursor.fetchone()
    
    if not row:
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': 'Gravadora não encontrada'}), 404
    
    gravadora = {
        'cod_gravadora': row[0],
        'nome': row[1],
        'endereco': row[2],
        'homepage': row[3],
        'telefones': []
    }
    
    cursor.execute("""
        SELECT telefone, tipo_telefone 
        FROM TELEFONE_GRAVADORA WHERE cod_gravadora = ?
    """, (cod_gravadora,))
    
    row = cursor.fetchone()
    while row:
        gravadora['telefones'].append({
            'numero': row[0],
            'tipo': row[1]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(gravadora)


@labels_bp.route('', methods=['POST'])
def criar_gravadora():
    """Cria uma nova gravadora com telefones."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO GRAVADORA (nome, endereco, homepage) 
            VALUES (?, ?, ?)
        """, (dados['nome'], dados.get('endereco'), dados.get('homepage')))
        
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_gravadora = int(cursor.fetchone()[0])
        
        telefones = dados.get('telefones', [])
        for tel in telefones:
            if tel.get('numero'):
                cursor.execute("""
                    INSERT INTO TELEFONE_GRAVADORA (cod_gravadora, telefone, tipo_telefone) 
                    VALUES (?, ?, ?)
                """, (cod_gravadora, tel['numero'], tel.get('tipo')))
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_gravadora': cod_gravadora}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400


@labels_bp.route('/<int:cod_gravadora>', methods=['PUT'])
def atualizar_gravadora(cod_gravadora):
    """Atualiza uma gravadora e seus telefones."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("SELECT 1 FROM GRAVADORA WHERE cod_gravadora = ?", (cod_gravadora,))
        if not cursor.fetchone():
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Gravadora não encontrada'}), 404
        
        cursor.execute("""
            UPDATE GRAVADORA SET nome = ?, endereco = ?, homepage = ?
            WHERE cod_gravadora = ?
        """, (dados.get('nome'), dados.get('endereco'), dados.get('homepage'), cod_gravadora))
        
        if 'telefones' in dados:
            cursor.execute("DELETE FROM TELEFONE_GRAVADORA WHERE cod_gravadora = ?", (cod_gravadora,))
            for tel in dados['telefones']:
                if tel.get('numero'):
                    cursor.execute("""
                        INSERT INTO TELEFONE_GRAVADORA (cod_gravadora, telefone, tipo_telefone)
                        VALUES (?, ?, ?)
                    """, (cod_gravadora, tel['numero'], tel.get('tipo')))
        
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Gravadora atualizada'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
