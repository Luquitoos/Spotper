from flask import request, jsonify
from routes import playlists_bp
from config.database import get_conexao

@playlists_bp.route('', methods=['GET'])
def listar_playlists():
    # Req (ix.a): Lista playlists com código, nome, data_criacao, tempo_total_execucao
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT p.cod_playlist, p.nome, p.data_criacao, p.tempo_total_execucao,
               (SELECT COUNT(*) FROM PLAYLIST_FAIXA pf WHERE pf.cod_playlist = p.cod_playlist) AS qtd_faixas
        FROM PLAYLIST p
        ORDER BY p.nome
    """)
    playlists = []
    row = cursor.fetchone()
    while row:
        playlists.append({
            'cod_playlist': row[0],
            'nome': row[1],
            'data_criacao': str(row[2]) if row[2] else None,
            'tempo_total_execucao': row[3],
            'qtd_faixas': row[4]
        })
        row = cursor.fetchone()
    cursor.close()
    conexao.close()
    return jsonify(playlists)

@playlists_bp.route('/<int:cod_playlist>', methods=['GET'])
def obter_playlist(cod_playlist):
    # Obtém uma playlist específica
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT p.cod_playlist, p.nome, p.data_criacao, p.tempo_total_execucao,
               (SELECT COUNT(*) FROM PLAYLIST_FAIXA pf WHERE pf.cod_playlist = p.cod_playlist) AS qtd_faixas
        FROM PLAYLIST p
        WHERE p.cod_playlist = ?
    """, (cod_playlist,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': 'Playlist não encontrada'}), 404
    playlist = {
        'cod_playlist': row[0],
        'nome': row[1],
        'data_criacao': str(row[2]) if row[2] else None,
        'tempo_total_execucao': row[3],
        'qtd_faixas': row[4]
    }
    cursor.close()
    conexao.close()
    return jsonify(playlist)

@playlists_bp.route('', methods=['POST'])
def criar_playlist():
    # Funcionalidade (i): Criação de playlists com faixas de diferentes álbuns
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO PLAYLIST (nome, data_criacao, tempo_total_execucao)
            VALUES (?, GETDATE(), 0)
        """, (dados['nome'],))
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        cod_playlist = int(row[0]) if row and row[0] else None
        if cod_playlist is None:
            conexao.rollback()
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Falha ao obter ID da playlist criada'}), 500
        ordem = 1
        for faixa in dados.get('faixas', []):
            cursor.execute("""
                INSERT INTO PLAYLIST_FAIXA (cod_playlist, cod_album, numero_unidade, 
                                           numero_faixa, ordem_reproducao, num_vezes_tocada)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (cod_playlist, faixa['cod_album'], faixa['numero_unidade'], 
                  faixa['numero_faixa'], ordem))
            ordem += 1
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'cod_playlist': cod_playlist}), 201
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

@playlists_bp.route('/<int:cod_playlist>', methods=['PUT'])
def atualizar_playlist(cod_playlist):
    # Funcionalidade (ii): Manutenção de playlists - remoção/inserção de músicas
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT cod_playlist FROM PLAYLIST WHERE cod_playlist = ?", (cod_playlist,))
        if not cursor.fetchone():
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Playlist não encontrada'}), 404
        
        if dados.get('nome'):
            cursor.execute("UPDATE PLAYLIST SET nome = ? WHERE cod_playlist = ?",
                          (dados.get('nome'), cod_playlist))
        
        if 'faixas' in dados:
            cursor.execute("DELETE FROM PLAYLIST_FAIXA WHERE cod_playlist = ?", (cod_playlist,))
            
            ordem = 1
            for faixa in dados.get('faixas', []):
                cursor.execute("""
                    INSERT INTO PLAYLIST_FAIXA (cod_playlist, cod_album, numero_unidade, 
                                               numero_faixa, ordem_reproducao, num_vezes_tocada)
                    VALUES (?, ?, ?, ?, ?, 0)
                """, (cod_playlist, faixa['cod_album'], faixa['numero_unidade'], 
                      faixa['numero_faixa'], ordem))
                ordem += 1
            
            cursor.execute("""
                UPDATE PLAYLIST SET tempo_total_execucao = (
                    SELECT COALESCE(SUM(f.tempo_execucao), 0)
                    FROM PLAYLIST_FAIXA pf
                    JOIN FAIXA f ON pf.cod_album = f.cod_album 
                                AND pf.numero_unidade = f.numero_unidade 
                                AND pf.numero_faixa = f.numero_faixa
                    WHERE pf.cod_playlist = ?
                )
                WHERE cod_playlist = ?
            """, (cod_playlist, cod_playlist))
        
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Playlist atualizada'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@playlists_bp.route('/<int:cod_playlist>', methods=['DELETE'])
def deletar_playlist(cod_playlist):
    # Deleta uma playlist
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT cod_playlist FROM PLAYLIST WHERE cod_playlist = ?", (cod_playlist,))
        if not cursor.fetchone():
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Playlist não encontrada'}), 404

        cursor.execute("DELETE FROM PLAYLIST WHERE cod_playlist = ?", (cod_playlist,))
        conexao.commit()
        
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Playlist removida'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@playlists_bp.route('/<int:cod_playlist>/tracks', methods=['GET'])
def listar_faixas_playlist(cod_playlist):
    # Req (ix.b): Lista faixas com data_ultima_vez_tocada e num_vezes_tocada
    conexao = get_conexao()
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT pf.ordem_reproducao, pf.cod_album, pf.numero_unidade, pf.numero_faixa,
               f.descricao AS nome_faixa, a.nome AS nome_album, tc.descricao AS tipo_composicao,
               f.tempo_execucao, pf.data_ultima_vez_tocada, pf.num_vezes_tocada
        FROM PLAYLIST_FAIXA pf
        JOIN FAIXA f ON pf.cod_album = f.cod_album 
                    AND pf.numero_unidade = f.numero_unidade 
                    AND pf.numero_faixa = f.numero_faixa
        JOIN ALBUM a ON f.cod_album = a.cod_album
        JOIN TIPO_COMPOSICAO tc ON f.cod_tipo_composicao = tc.cod_tipo_composicao
        WHERE pf.cod_playlist = ?
        ORDER BY pf.ordem_reproducao
    """, (cod_playlist,))
    faixas = []
    row = cursor.fetchone()
    while row:
        faixas.append({
            'ordem_reproducao': row[0],
            'cod_album': row[1],
            'numero_unidade': row[2],
            'numero_faixa': row[3],
            'nome_faixa': row[4],
            'nome_album': row[5],
            'tipo_composicao': row[6],
            'tempo_execucao': row[7],
            'data_ultima_vez_tocada': str(row[8]) if row[8] else None,
            'num_vezes_tocada': row[9]
        })
        row = cursor.fetchone()
    cursor.close()
    conexao.close()
    return jsonify(faixas)

@playlists_bp.route('/<int:cod_playlist>/tracks', methods=['POST'])
def adicionar_faixa_playlist(cod_playlist):
    # Adiciona uma faixa à playlist
    dados = request.get_json()
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            SELECT ISNULL(MAX(ordem_reproducao), 0) + 1 
            FROM PLAYLIST_FAIXA WHERE cod_playlist = ?
        """, (cod_playlist,))
        proxima_ordem = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO PLAYLIST_FAIXA (cod_playlist, cod_album, numero_unidade, 
                                       numero_faixa, ordem_reproducao, num_vezes_tocada)
            VALUES (?, ?, ?, ?, ?, 0)
        """, (cod_playlist, dados['cod_album'], dados['numero_unidade'], 
              dados['numero_faixa'], proxima_ordem))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Faixa adicionada'}), 201
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@playlists_bp.route('/<int:cod_playlist>/tracks/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>', methods=['DELETE'])
def remover_faixa_playlist(cod_playlist, cod_album, numero_unidade, numero_faixa):
    # Remove uma faixa da playlist
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            DELETE FROM PLAYLIST_FAIXA 
            WHERE cod_playlist = ? AND cod_album = ? 
              AND numero_unidade = ? AND numero_faixa = ?
        """, (cod_playlist, cod_album, numero_unidade, numero_faixa))
        if cursor.rowcount == 0:
            cursor.close()
            conexao.close()
            return jsonify({'error': True, 'message': 'Faixa não encontrada na playlist'}), 404
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Faixa removida da playlist'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400

@playlists_bp.route('/<int:cod_playlist>/tracks/<int:cod_album>/<int:numero_unidade>/<int:numero_faixa>/playback', methods=['POST'])
def registrar_reproducao(cod_playlist, cod_album, numero_unidade, numero_faixa):
    # Req (ix.b): Atualiza data_ultima_vez_tocada e num_vezes_tocada 
    conexao = get_conexao()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            UPDATE PLAYLIST_FAIXA
            SET data_ultima_vez_tocada = GETDATE(), num_vezes_tocada = num_vezes_tocada + 1
            WHERE cod_playlist = ? AND cod_album = ? 
              AND numero_unidade = ? AND numero_faixa = ?
        """, (cod_playlist, cod_album, numero_unidade, numero_faixa))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'success': True, 'message': 'Reprodução registrada'})
    except Exception as e:
        conexao.rollback()
        cursor.close()
        conexao.close()
        return jsonify({'error': True, 'message': str(e)}), 400
