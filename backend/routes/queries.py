# backend/routes/queries.py
# Rotas para Consultas Especiais (Views SQL)

from flask import jsonify
from routes import queries_bp
from config.database import get_conexao


@queries_bp.route('/albums-above-average', methods=['GET'])
def consulta_albuns_acima_media():
    """Requisito iii.a: Álbuns com preço acima da média."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM ALBUNS_ACIMA_MEDIA ORDER BY preco_compra DESC")
    
    resultados = []
    row = cursor.fetchone()
    while row:
        resultados.append({
            'cod_album': row[0],
            'nome': row[1],
            'descricao': row[2],
            'gravadora': row[3],
            'preco_compra': float(row[4]) if row[4] else None,
            'tipo_midia': row[5],
            'data_compra': str(row[6]) if row[6] else None,
            'data_gravacao': str(row[7]) if row[7] else None,
            'media_geral': float(row[8]) if row[8] else None
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(resultados)


@queries_bp.route('/label-most-dvorak-playlists', methods=['GET'])
def consulta_gravadora_dvorak():
    """Requisito iii.b: Gravadora com mais playlists com faixas de Dvorak."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM GRAVADORA_MAIS_PLAYLISTS_DVORAK")
    
    resultados = []
    row = cursor.fetchone()
    while row:
        resultados.append({
            'gravadora': row[0],
            'qtd_playlists': row[1]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(resultados)


@queries_bp.route('/composer-most-playlist-tracks', methods=['GET'])
def consulta_compositor_mais_faixas():
    """Requisito iii.c: Compositor com mais faixas em playlists."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM COMPOSITOR_MAIS_FAIXAS_PLAYLISTS")
    
    resultados = []
    row = cursor.fetchone()
    while row:
        resultados.append({
            'compositor': row[0],
            'qtd_faixas_em_playlists': row[1]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(resultados)


@queries_bp.route('/playlists-concerto-barroco', methods=['GET'])
def consulta_playlists_concerto_barroco():
    """Requisito iii.d: Playlists com todas faixas Concerto e Barroco."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM PLAYLISTS_CONCERTO_BARROCO ORDER BY nome_playlist")
    
    resultados = []
    row = cursor.fetchone()
    while row:
        resultados.append({
            'cod_playlist': row[0],
            'nome_playlist': row[1],
            'data_criacao': str(row[2]) if row[2] else None,
            'tempo_total_execucao': row[3]
        })
        row = cursor.fetchone()
    
    cursor.close()
    conexao.close()
    return jsonify(resultados)


@queries_bp.route('/ddd-average', methods=['GET'])
def obter_media_ddd():
    """Retorna a média de preço dos álbuns com faixas DDD."""
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    cursor.execute("""
        SELECT AVG(a.preco_compra)
        FROM ALBUM a
        WHERE EXISTS (
            SELECT 1 FROM FAIXA f 
            WHERE f.cod_album = a.cod_album 
            AND f.tipo_gravacao = 'DDD'
        )
    """)
    row = cursor.fetchone()
    media = float(row[0]) if row and row[0] else 50.0
    
    cursor.close()
    conexao.close()
    return jsonify({'media_ddd': media, 'max_permitido': media * 3})
