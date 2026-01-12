# backend/routes/tracks.py
# Rotas para Faixas

from flask import request, jsonify
from routes import tracks_bp
from config.database import get_conexao


@tracks_bp.route('', methods=['POST'])
def criar_faixa():
    """Cria uma nova faixa."""
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
        
        # Associar compositores
        for cod_compositor in dados.get('compositores', []):
            cursor.execute("""
                INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
                VALUES (?, ?, ?, ?)
            """, (dados['cod_album'], dados['numero_unidade'], dados['numero_faixa'], cod_compositor))
        
        # Associar intérpretes
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
    """Atualiza uma faixa."""
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
        
        # Atualizar compositores se fornecidos
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
        
        # Atualizar intérpretes se fornecidos
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
    """Deleta uma faixa."""
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
    """Associa um compositor a uma faixa."""
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
    """Associa um intérprete a uma faixa."""
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
