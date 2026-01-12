# backend/routes/composers.py
# Rotas para Compositores

from flask import request, jsonify
from routes import composers_bp
from config.database import get_conexao


@composers_bp.route('', methods=['GET'])
def listar_compositores():
    """Lista todos os compositores."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT c.cod_compositor, c.nome, c.cidade_nascimento, c.pais_nascimento,
               c.data_nascimento, c.data_morte, c.cod_periodo, p.descricao AS periodo
        FROM COMPOSITOR c
        JOIN PERIODO_MUSICAL p ON c.cod_periodo = p.cod_periodo
        ORDER BY c.nome
    """)
    
    compositores = []
    row = cursor.fetchone()
    while row:
        compositores.append({
            'cod_compositor': row[0],
            'nome': row[1],
            'cidade_nascimento': row[2],
            'pais_nascimento': row[3],
            'data_nascimento': str(row[4]) if row[4] else None,
            'data_morte': str(row[5]) if row[5] else None,
            'cod_periodo': row[6],
            'periodo': row[7]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(compositores)


@composers_bp.route('/<int:cod_compositor>', methods=['GET'])
def obter_compositor(cod_compositor):
    """Obtém um compositor específico."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT c.cod_compositor, c.nome, c.cidade_nascimento, c.pais_nascimento,
               c.data_nascimento, c.data_morte, c.cod_periodo, p.descricao AS periodo
        FROM COMPOSITOR c
        JOIN PERIODO_MUSICAL p ON c.cod_periodo = p.cod_periodo
        WHERE c.cod_compositor = ?
    """, (cod_compositor,))
    
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': 'Compositor não encontrado'}), 404
    
    compositor = {
        'cod_compositor': row[0],
        'nome': row[1],
        'cidade_nascimento': row[2],
        'pais_nascimento': row[3],
        'data_nascimento': str(row[4]) if row[4] else None,
        'data_morte': str(row[5]) if row[5] else None,
        'cod_periodo': row[6],
        'periodo': row[7]
    }
    
    cursor.close()
    conexao.close()
    return jsonify(compositor)


@composers_bp.route('', methods=['POST'])
def criar_compositor():
    """Cria um novo compositor."""
    dados = request.get_json()
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO COMPOSITOR (nome, cidade_nascimento, pais_nascimento, 
                                    data_nascimento, data_morte, cod_periodo)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            dados['nome'], 
            dados.get('cidade_nascimento'),
            dados.get('pais_nascimento'),
            dados['data_nascimento'],
            dados.get('data_morte'),
            dados['cod_periodo']
        ))
        
        cursor.execute("SELECT SCOPE_IDENTITY()")
        cod_compositor = cursor.fetchone()[0]
        
        conexao.commit()
        cursor.close()
        conexao.close()
        
        return jsonify({'success': True, 'cod_compositor': int(cod_compositor)}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400


@composers_bp.route('/search', methods=['GET'])
def buscar_compositores():
    """Busca compositores por nome."""
    nome = request.args.get('nome', '')
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT c.cod_compositor, c.nome, c.cod_periodo, p.descricao AS periodo
        FROM COMPOSITOR c
        JOIN PERIODO_MUSICAL p ON c.cod_periodo = p.cod_periodo
        WHERE c.nome LIKE ?
        ORDER BY c.nome
    """, (f'%{nome}%',))
    
    compositores = []
    row = cursor.fetchone()
    while row:
        compositores.append({
            'cod_compositor': row[0],
            'nome': row[1],
            'cod_periodo': row[2],
            'periodo': row[3]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(compositores)


@composers_bp.route('/albums', methods=['GET'])
def buscar_albuns_compositor():
    """Busca álbuns por nome do compositor usando a função do banco."""
    nome = request.args.get('nome', '')
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM dbo.BUSCAR_ALBUNS_POR_COMPOSITOR(?)", (nome,))
    
    albuns = []
    row = cursor.fetchone()
    while row:
        albuns.append({
            'cod_album': row[0],
            'nome_album': row[1],
            'descricao': row[2],
            'gravadora': row[3],
            'tipo_midia': row[4],
            'preco_compra': float(row[5]) if row[5] else None,
            'data_compra': str(row[6]) if row[6] else None,
            'data_gravacao': str(row[7]) if row[7] else None,
            'tipo_compra': row[8],
            'qtd_unidades': row[9]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(albuns)
