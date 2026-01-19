"""
Povoamento completo do banco de dados BDSpotPer
Este script popula todas as tabelas com dados realistas para testes,
incluindo casos de borda e dados específicos para validar as consultas.

Regras respeitadas:
- data_gravacao > 01.01.2000
- CD requer tipo_gravacao ADD ou DDD
- VINIL/DOWNLOAD não podem ter tipo_gravacao
- Barroco exige DDD
- Preço <= 3 * média de álbuns all-DDD
- Max 64 faixas por álbum
"""

from datetime import date, datetime
import random

# Importar conexão do módulo existente
from config.database import get_conexao

def limpar_dados(cursor):
    """Remove todos os dados existentes na ordem correta (respeitando FKs)"""
    print("Limpando dados existentes...")
    cursor.execute("DELETE FROM PLAYLIST_FAIXA")
    cursor.execute("DELETE FROM PLAYLIST")
    cursor.execute("DELETE FROM FAIXA_INTERPRETE")
    cursor.execute("DELETE FROM FAIXA_COMPOSITOR")
    cursor.execute("DELETE FROM FAIXA")
    cursor.execute("DELETE FROM ALBUM")
    cursor.execute("DELETE FROM COMPOSITOR")
    cursor.execute("DELETE FROM INTERPRETE")
    cursor.execute("DELETE FROM TIPO_COMPOSICAO")
    cursor.execute("DELETE FROM TELEFONE_GRAVADORA")
    cursor.execute("DELETE FROM GRAVADORA")
    cursor.execute("DELETE FROM PERIODO_MUSICAL")
    cursor.execute("DBCC CHECKIDENT ('PERIODO_MUSICAL', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('COMPOSITOR', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('INTERPRETE', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('TIPO_COMPOSICAO', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('GRAVADORA', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('ALBUM', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('PLAYLIST', RESEED, 0)")
    print("Dados limpos com sucesso!")

def povoar_periodos(cursor):
    """Insere períodos musicais"""
    print("Inserindo períodos musicais...")
    periodos = [
        ('Idade Média', 500, 1400),
        ('Renascença', 1400, 1600),
        ('Barroco', 1600, 1750),
        ('Clássico', 1750, 1820),
        ('Romântico', 1820, 1910),
        ('Moderno', 1910, 2000),
    ]
    for desc, inicio, fim in periodos:
        cursor.execute(
            "INSERT INTO PERIODO_MUSICAL (descricao, ano_inicio, ano_fim) VALUES (?, ?, ?)",
            (desc, inicio, fim)
        )
    print(f"  {len(periodos)} períodos inseridos")

def povoar_compositores(cursor):
    """Insere compositores de vários períodos"""
    print("Inserindo compositores...")
    
    # Buscar IDs dos períodos
    cursor.execute("SELECT cod_periodo, descricao FROM PERIODO_MUSICAL")
    periodos = {row[1]: row[0] for row in cursor.fetchall()}
    
    compositores = [
        # Barroco (cod_periodo para Barroco)
        ('Johann Sebastian Bach', 'Eisenach', 'Alemanha', '1685-03-21', '1750-07-28', periodos['Barroco']),
        ('Antonio Vivaldi', 'Veneza', 'Itália', '1678-03-04', '1741-07-28', periodos['Barroco']),
        ('George Frideric Handel', 'Halle', 'Alemanha', '1685-02-23', '1759-04-14', periodos['Barroco']),
        ('Arcangelo Corelli', 'Fusignano', 'Itália', '1653-02-17', '1713-01-08', periodos['Barroco']),
        
        # Clássico
        ('Wolfgang Amadeus Mozart', 'Salzburgo', 'Áustria', '1756-01-27', '1791-12-05', periodos['Clássico']),
        ('Ludwig van Beethoven', 'Bonn', 'Alemanha', '1770-12-17', '1827-03-26', periodos['Clássico']),
        ('Joseph Haydn', 'Rohrau', 'Áustria', '1732-03-31', '1809-05-31', periodos['Clássico']),
        
        # Romântico - INCLUINDO DVORAK PARA CONSULTA b
        ('Antonín Dvorak', 'Nelahozeves', 'Tchéquia', '1841-09-08', '1904-05-01', periodos['Romântico']),
        ('Pyotr Ilyich Tchaikovsky', 'Votkinsk', 'Rússia', '1840-05-07', '1893-11-06', periodos['Romântico']),
        ('Johannes Brahms', 'Hamburgo', 'Alemanha', '1833-05-07', '1897-04-03', periodos['Romântico']),
        ('Frédéric Chopin', 'Żelazowa Wola', 'Polônia', '1810-03-01', '1849-10-17', periodos['Romântico']),
        ('Franz Schubert', 'Viena', 'Áustria', '1797-01-31', '1828-11-19', periodos['Romântico']),
        
        # Moderno
        ('Igor Stravinsky', 'Oranienbaum', 'Rússia', '1882-06-17', '1971-04-06', periodos['Moderno']),
        ('Claude Debussy', 'Saint-Germain-en-Laye', 'França', '1862-08-22', '1918-03-25', periodos['Moderno']),
        ('Sergei Rachmaninoff', 'Semyonovo', 'Rússia', '1873-04-01', '1943-03-28', periodos['Moderno']),
    ]
    
    for comp in compositores:
        cursor.execute("""
            INSERT INTO COMPOSITOR (nome, cidade_nascimento, pais_nascimento, 
                                   data_nascimento, data_morte, cod_periodo)
            VALUES (?, ?, ?, ?, ?, ?)
        """, comp)
    print(f"  {len(compositores)} compositores inseridos")

def povoar_interpretes(cursor):
    """Insere intérpretes de vários tipos"""
    print("Inserindo intérpretes...")
    interpretes = [
        ('Berliner Philharmoniker', 'Orquestra'),
        ('Wiener Philharmoniker', 'Orquestra'),
        ('London Symphony Orchestra', 'Orquestra'),
        ('Academy of St Martin in the Fields', 'Orquestra'),
        ('Chicago Symphony Orchestra', 'Orquestra'),
        ('Emerson String Quartet', 'Quarteto'),
        ('Beaux Arts Trio', 'Trio'),
        ('Amadeus Quartet', 'Quarteto'),
        ('Luciano Pavarotti', 'Tenor'),
        ('Maria Callas', 'Soprano'),
        ('Plácido Domingo', 'Tenor'),
        ('Anne-Sophie Mutter', 'Solista'),
        ('Vladimir Horowitz', 'Solista'),
        ('Yo-Yo Ma', 'Solista'),
        ('Lang Lang', 'Solista'),
        ('Kronos Quartet', 'Quarteto'),
        ('Les Arts Florissants', 'Ensemble'),
        ('Concerto Köln', 'Ensemble'),
    ]
    for nome, tipo in interpretes:
        cursor.execute(
            "INSERT INTO INTERPRETE (nome, tipo) VALUES (?, ?)",
            (nome, tipo)
        )
    print(f"  {len(interpretes)} intérpretes inseridos")

def povoar_tipos_composicao(cursor):
    """Insere tipos de composição"""
    print("Inserindo tipos de composição...")
    tipos = [
        'Sinfonia',
        'Concerto',
        'Sonata',
        'Ópera',
        'Fuga',
        'Cantata',
        'Suíte',
        'Prelúdio',
        'Valsa',
        'Noturno',
        'Rapsódia',
        'Quarteto',
        'Trio',
        'Missa',
        'Oratório',
    ]
    for tipo in tipos:
        cursor.execute(
            "INSERT INTO TIPO_COMPOSICAO (descricao) VALUES (?)",
            (tipo,)
        )
    print(f"  {len(tipos)} tipos inseridos")

def povoar_gravadoras(cursor):
    """Insere gravadoras com telefones"""
    print("Inserindo gravadoras...")
    gravadoras = [
        ('Deutsche Grammophon', 'Hamburgo, Alemanha', 'https://www.deutschegrammophon.com', 
         [('49-40-123456', 'Comercial'), ('49-40-654321', 'WhatsApp')]),
        ('Decca Records', 'Londres, Reino Unido', 'https://www.decca.com',
         [('44-20-987654', 'Comercial')]),
        ('Sony Classical', 'Nova York, EUA', 'https://www.sonyclassical.com',
         [('1-212-555-0100', 'Comercial'), ('1-212-555-0101', 'Celular')]),
        ('Warner Classics', 'Paris, França', 'https://www.warnerclassics.com',
         [('33-1-555-1234', 'Comercial')]),
        ('Naxos Records', 'Hong Kong, China', 'https://www.naxos.com',
         [('852-555-9999', 'Comercial'), ('852-555-8888', 'WhatsApp')]),
        ('Hyperion Records', 'Londres, Reino Unido', 'https://www.hyperion-records.co.uk',
         [('44-20-111222', 'Fixo')]),
        ('Chandos Records', 'Essex, Reino Unido', 'https://www.chandos.net',
         [('44-12-333444', 'Comercial')]),
        ('BIS Records', 'Estocolmo, Suécia', 'https://www.bis.se',
         [('46-8-555666', 'Comercial')]),
    ]
    
    for nome, endereco, homepage, telefones in gravadoras:
        cursor.execute(
            "INSERT INTO GRAVADORA (nome, endereco, homepage) VALUES (?, ?, ?)",
            (nome, endereco, homepage)
        )
        cod_gravadora = cursor.execute("SELECT @@IDENTITY").fetchone()[0]
        for telefone, tipo in telefones:
            cursor.execute(
                "INSERT INTO TELEFONE_GRAVADORA (cod_gravadora, telefone, tipo_telefone) VALUES (?, ?, ?)",
                (cod_gravadora, telefone, tipo)
            )
    print(f"  {len(gravadoras)} gravadoras inseridas")

def povoar_albuns_e_faixas(cursor):
    """Insere álbuns com suas faixas, respeitando todas as regras"""
    print("Inserindo álbuns e faixas...")
    
    # Buscar IDs - mapear por NOME para garantir integridade
    cursor.execute("SELECT cod_gravadora, nome FROM GRAVADORA")
    gravadoras = {row[1]: row[0] for row in cursor.fetchall()}
    
    cursor.execute("SELECT cod_tipo_composicao, descricao FROM TIPO_COMPOSICAO")
    tipos_comp = {row[1]: row[0] for row in cursor.fetchall()}
    
    cursor.execute("SELECT cod_compositor, nome FROM COMPOSITOR")
    compositores = {row[1]: row[0] for row in cursor.fetchall()}
    
    cursor.execute("SELECT cod_interprete FROM INTERPRETE")
    interpretes = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT cod_periodo, descricao FROM PERIODO_MUSICAL")
    periodos = {row[1]: row[0] for row in cursor.fetchall()}
    
    # Álbuns com preços variados para testar consulta a (acima da média)
    # Alguns álbuns com preço alto, outros com preço baixo
    albuns = [
        # Álbuns BARROCOS (exigem DDD) - para consulta d
        {
            'nome': 'As Quatro Estações - Vivaldi',
            'descricao': 'Obra-prima do barroco italiano, os quatro concertos para violino de Vivaldi.',
            'gravadora': 'Deutsche Grammophon',
            'preco': 89.90,
            'data_compra': '2023-05-15',
            'data_gravacao': '2020-03-10',
            'tipo_compra': 'Importação',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Concerto No. 1 em Mi Maior - Primavera: I. Allegro', 'Concerto', 198, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 1 em Mi Maior - Primavera: II. Largo', 'Concerto', 165, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 1 em Mi Maior - Primavera: III. Allegro', 'Concerto', 210, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 2 em Sol Menor - Verão: I. Allegro', 'Concerto', 302, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 2 em Sol Menor - Verão: II. Adagio', 'Concerto', 138, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 2 em Sol Menor - Verão: III. Presto', 'Concerto', 175, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 3 em Fá Maior - Outono: I. Allegro', 'Concerto', 295, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 3 em Fá Maior - Outono: II. Adagio', 'Concerto', 154, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 3 em Fá Maior - Outono: III. Allegro', 'Concerto', 198, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 4 em Fá Menor - Inverno: I. Allegro', 'Concerto', 205, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 4 em Fá Menor - Inverno: II. Largo', 'Concerto', 142, 'DDD', ['Antonio Vivaldi']),
                ('Concerto No. 4 em Fá Menor - Inverno: III. Allegro', 'Concerto', 188, 'DDD', ['Antonio Vivaldi']),
            ]
        },
        {
            'nome': 'Brandenburg Concertos - Bach',
            'descricao': 'Os seis concertos de Brandenburgo de J.S. Bach, ápice do concerto barroco.',
            'gravadora': 'Decca Records',
            'preco': 120.00,
            'data_compra': '2022-11-20',
            'data_gravacao': '2018-06-15',
            'tipo_compra': 'Loja Nacional',
            'tipo_midia': 'CD',
            'qtd_unidades': 2,
            'faixas': [
                ('Brandenburg Concerto No. 1 em Fá Maior: I. Allegro', 'Concerto', 245, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 1 em Fá Maior: II. Adagio', 'Concerto', 198, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 2 em Fá Maior: I. Allegro', 'Concerto', 302, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 3 em Sol Maior: I. Allegro', 'Concerto', 356, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 4 em Sol Maior: I. Allegro', 'Concerto', 412, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 5 em Ré Maior: I. Allegro', 'Concerto', 598, 'DDD', ['Johann Sebastian Bach']),
                ('Brandenburg Concerto No. 6 em Si Bemol Maior: I. Allegro', 'Concerto', 324, 'DDD', ['Johann Sebastian Bach']),
            ]
        },
        {
            'nome': 'Concertos Grossos Op. 6 - Corelli',
            'descricao': 'Concerti Grossi de Arcangelo Corelli, obras fundamentais do barroco.',
            'gravadora': 'Hyperion Records',
            'preco': 75.50,
            'data_compra': '2024-01-10',
            'data_gravacao': '2021-09-05',
            'tipo_compra': 'Online',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Concerto Grosso Op. 6 No. 1: I. Largo', 'Concerto', 145, 'DDD', ['Arcangelo Corelli']),
                ('Concerto Grosso Op. 6 No. 1: II. Allegro', 'Concerto', 198, 'DDD', ['Arcangelo Corelli']),
                ('Concerto Grosso Op. 6 No. 2: I. Vivace', 'Concerto', 167, 'DDD', ['Arcangelo Corelli']),
                ('Concerto Grosso Op. 6 No. 3: I. Largo', 'Concerto', 156, 'DDD', ['Arcangelo Corelli']),
                ('Concerto Grosso Op. 6 No. 4: I. Adagio', 'Concerto', 178, 'DDD', ['Arcangelo Corelli']),
                ('Concerto Grosso Op. 6 No. 8 Natal: I. Vivace', 'Concerto', 203, 'DDD', ['Arcangelo Corelli']),
            ]
        },
        
        # Álbuns com DVORAK para consulta b (gravadora com mais playlists Dvorak)
        {
            'nome': 'Sinfonia do Novo Mundo - Dvorak',
            'descricao': 'A célebre Sinfonia No. 9 de Antonín Dvorak, composta nos EUA.',
            'gravadora': 'Deutsche Grammophon',  # Deutsche Grammophon - terá mais playlists Dvorak
            'preco': 95.00,
            'data_compra': '2023-08-22',
            'data_gravacao': '2019-04-12',
            'tipo_compra': 'Importação',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Sinfonia No. 9 - Novo Mundo: I. Adagio - Allegro molto', 'Sinfonia', 542, 'DDD', ['Antonín Dvorak']),
                ('Sinfonia No. 9 - Novo Mundo: II. Largo', 'Sinfonia', 720, 'DDD', ['Antonín Dvorak']),
                ('Sinfonia No. 9 - Novo Mundo: III. Scherzo', 'Sinfonia', 478, 'DDD', ['Antonín Dvorak']),
                ('Sinfonia No. 9 - Novo Mundo: IV. Allegro con fuoco', 'Sinfonia', 698, 'DDD', ['Antonín Dvorak']),
            ]
        },
        {
            'nome': 'Concerto para Violoncelo - Dvorak',
            'descricao': 'O famoso Concerto para Violoncelo em Si menor de Dvorak.',
            'gravadora': 'Deutsche Grammophon',  # Deutsche Grammophon
            'preco': 85.00,
            'data_compra': '2024-02-14',
            'data_gravacao': '2022-07-20',
            'tipo_compra': 'Online',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Concerto para Violoncelo em Si Menor: I. Allegro', 'Concerto', 898, 'DDD', ['Antonín Dvorak']),
                ('Concerto para Violoncelo em Si Menor: II. Adagio', 'Concerto', 712, 'DDD', ['Antonín Dvorak']),
                ('Concerto para Violoncelo em Si Menor: III. Allegro moderato', 'Concerto', 780, 'DDD', ['Antonín Dvorak']),
            ]
        },
        {
            'nome': 'Danças Eslavas - Dvorak',
            'descricao': 'As vibrantes Danças Eslavas Op. 46 e Op. 72 de Dvorak.',
            'gravadora': 'Sony Classical',  # Sony Classical - outra gravadora com Dvorak
            'preco': 65.00,
            'data_compra': '2023-12-05',
            'data_gravacao': '2020-11-15',
            'tipo_compra': 'Loja Nacional',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Dança Eslava Op. 46 No. 1 em Dó Maior', 'Suíte', 245, 'DDD', ['Antonín Dvorak']),
                ('Dança Eslava Op. 46 No. 2 em Mi Menor', 'Suíte', 312, 'DDD', ['Antonín Dvorak']),
                ('Dança Eslava Op. 46 No. 8 em Sol Menor', 'Suíte', 267, 'DDD', ['Antonín Dvorak']),
                ('Dança Eslava Op. 72 No. 2 em Mi Menor', 'Suíte', 356, 'DDD', ['Antonín Dvorak']),
            ]
        },
        
        # Álbuns com preço ALTO para consulta a (acima da média)
        {
            'nome': 'Box Beethoven Sinfonias Completas',
            'descricao': 'Todas as 9 sinfonias de Beethoven em gravação de referência.',
            'gravadora': 'Deutsche Grammophon',
            'preco': 250.00,  # Preço bem acima da média
            'data_compra': '2022-06-10',
            'data_gravacao': '2015-03-20',
            'tipo_compra': 'Importação',
            'tipo_midia': 'CD',
            'qtd_unidades': 5,
            'faixas': [
                ('Sinfonia No. 1 em Dó Maior: I. Adagio molto', 'Sinfonia', 512, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 3 Eroica: I. Allegro con brio', 'Sinfonia', 978, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 5: I. Allegro con brio', 'Sinfonia', 452, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 5: II. Andante con moto', 'Sinfonia', 598, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 5: III. Allegro', 'Sinfonia', 312, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 5: IV. Allegro - Presto', 'Sinfonia', 678, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 6 Pastoral: I. Allegro ma non troppo', 'Sinfonia', 720, 'DDD', ['Ludwig van Beethoven']),
                ('Sinfonia No. 9 Coral: IV. Presto - Allegro assai', 'Sinfonia', 1456, 'DDD', ['Ludwig van Beethoven']),
            ]
        },
        {
            'nome': 'Edição Deluxe Mozart - Óperas',
            'descricao': 'Coleção premium das principais óperas de Mozart.',
            'gravadora': 'Decca Records',
            'preco': 320.00,  # Preço muito alto
            'data_compra': '2021-10-15',
            'data_gravacao': '2016-08-10',
            'tipo_compra': 'Importação Premium',
            'tipo_midia': 'CD',
            'qtd_unidades': 8,
            'faixas': [
                ('A Flauta Mágica: Overture', 'Ópera', 412, 'DDD', ['Wolfgang Amadeus Mozart']),
                ('A Flauta Mágica: Der Vogelfänger bin ich ja', 'Ópera', 185, 'DDD', ['Wolfgang Amadeus Mozart']),
                ('Don Giovanni: Overture', 'Ópera', 367, 'DDD', ['Wolfgang Amadeus Mozart']),
                ('Don Giovanni: Là ci darem la mano', 'Ópera', 245, 'DDD', ['Wolfgang Amadeus Mozart']),
                ('As Bodas de Fígaro: Overture', 'Ópera', 278, 'DDD', ['Wolfgang Amadeus Mozart']),
                ('As Bodas de Fígaro: Non più andrai', 'Ópera', 312, 'DDD', ['Wolfgang Amadeus Mozart']),
            ]
        },
        
        # Álbuns com preço BAIXO para balancear média
        {
            'nome': 'Noturnos de Chopin',
            'descricao': 'Seleção dos mais belos Noturnos de Frédéric Chopin.',
            'gravadora': 'Naxos Records',
            'preco': 35.00,  # Preço baixo
            'data_compra': '2024-03-01',
            'data_gravacao': '2023-01-15',
            'tipo_compra': 'Download',
            'tipo_midia': 'DOWNLOAD',
            'qtd_unidades': 1,
            'faixas': [
                ('Noturno Op. 9 No. 1 em Si Bemol Menor', 'Noturno', 345, None, ['Frédéric Chopin']),
                ('Noturno Op. 9 No. 2 em Mi Bemol Maior', 'Noturno', 278, None, ['Frédéric Chopin']),
                ('Noturno Op. 15 No. 1 em Fá Maior', 'Noturno', 312, None, ['Frédéric Chopin']),
                ('Noturno Op. 15 No. 2 em Fá Sustenido Maior', 'Noturno', 245, None, ['Frédéric Chopin']),
                ('Noturno Op. 27 No. 2 em Ré Bemol Maior', 'Noturno', 367, None, ['Frédéric Chopin']),
            ]
        },
        {
            'nome': 'Valsas Românticas',
            'descricao': 'Valsas clássicas do período romântico.',
            'gravadora': 'Warner Classics',
            'preco': 29.90,  # Preço baixo
            'data_compra': '2024-01-20',
            'data_gravacao': '2022-05-10',
            'tipo_compra': 'Online',
            'tipo_midia': 'DOWNLOAD',
            'qtd_unidades': 1,
            'faixas': [
                ('Valsa Op. 64 No. 1 - Minuto', 'Valsa', 112, None, ['Frédéric Chopin']),
                ('Valsa Op. 64 No. 2 em Dó Sustenido Menor', 'Valsa', 256, None, ['Frédéric Chopin']),
                ('Valsa Op. 69 No. 1 - Adeus', 'Valsa', 298, None, ['Frédéric Chopin']),
            ]
        },
        
        # Álbum VINIL (sem tipo_gravacao)
        {
            'nome': 'Clássicos em Vinil - Tchaikovsky',
            'descricao': 'Gravação vintage do Concerto para Piano No. 1 de Tchaikovsky.',
            'gravadora': 'Chandos Records',
            'preco': 150.00,
            'data_compra': '2023-07-14',
            'data_gravacao': '2005-02-20',
            'tipo_compra': 'Leilão',
            'tipo_midia': 'VINIL',
            'qtd_unidades': 2,
            'faixas': [
                ('Concerto para Piano No. 1: I. Allegro non troppo', 'Concerto', 1245, None, ['Pyotr Ilyich Tchaikovsky']),
                ('Concerto para Piano No. 1: II. Andantino semplice', 'Concerto', 432, None, ['Pyotr Ilyich Tchaikovsky']),
                ('Concerto para Piano No. 1: III. Allegro con fuoco', 'Concerto', 412, None, ['Pyotr Ilyich Tchaikovsky']),
            ]
        },
        
        # Álbuns com ADD (não DDD)
        {
            'nome': 'Brahms Sinfonias 1 e 2',
            'descricao': 'Sinfonias de Johannes Brahms em gravação clássica ADD.',
            'gravadora': 'BIS Records',
            'preco': 55.00,
            'data_compra': '2022-04-08',
            'data_gravacao': '2010-11-20',
            'tipo_compra': 'Loja Nacional',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Sinfonia No. 1 em Dó Menor: I. Un poco sostenuto', 'Sinfonia', 856, 'ADD', ['Johannes Brahms']),
                ('Sinfonia No. 1 em Dó Menor: II. Andante sostenuto', 'Sinfonia', 523, 'ADD', ['Johannes Brahms']),
                ('Sinfonia No. 2 em Ré Maior: I. Allegro non troppo', 'Sinfonia', 912, 'ADD', ['Johannes Brahms']),
                ('Sinfonia No. 2 em Ré Maior: IV. Allegro con spirito', 'Sinfonia', 578, 'ADD', ['Johannes Brahms']),
            ]
        },
        
        # Mais álbuns para dados ricos
        {
            'nome': 'Stravinsky - A Sagração da Primavera',
            'descricao': 'A revolucionária obra de Igor Stravinsky que mudou a música do século XX.',
            'gravadora': 'Sony Classical',
            'preco': 78.00,
            'data_compra': '2023-09-18',
            'data_gravacao': '2021-02-14',
            'tipo_compra': 'Online',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('A Sagração da Primavera - Parte I: Introdução', 'Suíte', 198, 'DDD', ['Igor Stravinsky']),
                ('A Sagração da Primavera - Parte I: Les Augures printaniers', 'Suíte', 245, 'DDD', ['Igor Stravinsky']),
                ('A Sagração da Primavera - Parte I: Jeu du rapt', 'Suíte', 78, 'DDD', ['Igor Stravinsky']),
                ('A Sagração da Primavera - Parte II: Introduction', 'Suíte', 267, 'DDD', ['Igor Stravinsky']),
                ('A Sagração da Primavera - Parte II: Danse sacrale', 'Suíte', 312, 'DDD', ['Igor Stravinsky']),
            ]
        },
        {
            'nome': 'Debussy - Prelúdios Livro I',
            'descricao': 'Os impressionistas prelúdios para piano de Claude Debussy.',
            'gravadora': 'Warner Classics',
            'preco': 48.00,
            'data_compra': '2024-02-28',
            'data_gravacao': '2023-06-10',
            'tipo_compra': 'Loja Nacional',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Prelúdio I: Danseuses de Delphes', 'Prelúdio', 198, 'DDD', ['Claude Debussy']),
                ('Prelúdio II: Voiles', 'Prelúdio', 245, 'DDD', ['Claude Debussy']),
                ('Prelúdio III: Le vent dans la plaine', 'Prelúdio', 134, 'DDD', ['Claude Debussy']),
                ('Prelúdio VIII: La fille aux cheveux de lin', 'Prelúdio', 156, 'DDD', ['Claude Debussy']),
                ('Prelúdio X: La cathédrale engloutie', 'Prelúdio', 378, 'DDD', ['Claude Debussy']),
                ('Prelúdio XII: Minstrels', 'Prelúdio', 145, 'DDD', ['Claude Debussy']),
            ]
        },
        {
            'nome': 'Rachmaninoff - Concerto No. 2',
            'descricao': 'O emocionante Concerto para Piano No. 2 de Rachmaninoff.',
            'gravadora': 'Decca Records',
            'preco': 68.00,
            'data_compra': '2023-11-11',
            'data_gravacao': '2020-09-22',
            'tipo_compra': 'Online',
            'tipo_midia': 'CD',
            'qtd_unidades': 1,
            'faixas': [
                ('Concerto para Piano No. 2: I. Moderato', 'Concerto', 678, 'DDD', ['Sergei Rachmaninoff']),
                ('Concerto para Piano No. 2: II. Adagio sostenuto', 'Concerto', 712, 'DDD', ['Sergei Rachmaninoff']),
                ('Concerto para Piano No. 2: III. Allegro scherzando', 'Concerto', 645, 'DDD', ['Sergei Rachmaninoff']),
            ]
        },
    ]
    
    for album in albuns:
        # Inserir álbum
        cursor.execute("""
            INSERT INTO ALBUM (nome, descricao, cod_gravadora, preco_compra, data_compra,
                              data_gravacao, tipo_compra, tipo_midia, qtd_unidades)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (album['nome'], album['descricao'], gravadoras[album['gravadora']], album['preco'],
              album['data_compra'], album['data_gravacao'], album['tipo_compra'],
              album['tipo_midia'], album['qtd_unidades']))
        
        cod_album = cursor.execute("SELECT @@IDENTITY").fetchone()[0]
        
        # Inserir faixas
        for idx, faixa in enumerate(album['faixas'], 1):
            descricao, tipo_comp, tempo, tipo_grav, comps = faixa
            
            cursor.execute("""
                INSERT INTO FAIXA (cod_album, numero_unidade, numero_faixa, descricao,
                                  cod_tipo_composicao, tempo_execucao, tipo_gravacao)
                VALUES (?, 1, ?, ?, ?, ?, ?)
            """, (cod_album, idx, descricao, tipos_comp[tipo_comp], tempo, tipo_grav))
            
            # Associar compositores
            for comp_nome in comps:
                if comp_nome in compositores:
                    cursor.execute("""
                        INSERT INTO FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
                        VALUES (?, 1, ?, ?)
                    """, (cod_album, idx, compositores[comp_nome]))
            
            # Associar intérpretes aleatórios (1-3)
            for interp_id in random.sample(interpretes, min(random.randint(1, 3), len(interpretes))):
                cursor.execute("""
                    INSERT INTO FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
                    VALUES (?, 1, ?, ?)
                """, (cod_album, idx, interp_id))
    
    print(f"  {len(albuns)} álbuns inseridos com suas faixas")

def povoar_playlists(cursor):
    """
    Cria playlists específicas para testar as consultas:
    - Consulta b: Playlists com Dvorak (Deutsche Grammophon terá mais)
    - Consulta c: Compositor com mais faixas em playlists
    - Consulta d: Playlist 100% Concerto + Barroco
    """
    print("Inserindo playlists...")
    
    # Buscar dados para montar playlists
    cursor.execute("""
        SELECT f.cod_album, f.numero_unidade, f.numero_faixa, f.descricao,
               tc.descricao as tipo_comp, pm.descricao as periodo,
               c.nome as compositor
        FROM FAIXA f
        JOIN TIPO_COMPOSICAO tc ON f.cod_tipo_composicao = tc.cod_tipo_composicao
        JOIN FAIXA_COMPOSITOR fc ON f.cod_album = fc.cod_album 
            AND f.numero_unidade = fc.numero_unidade 
            AND f.numero_faixa = fc.numero_faixa
        JOIN COMPOSITOR c ON fc.cod_compositor = c.cod_compositor
        JOIN PERIODO_MUSICAL pm ON c.cod_periodo = pm.cod_periodo
    """)
    faixas = cursor.fetchall()
    
    # Organizar faixas por características
    faixas_dvorak = [f for f in faixas if 'Dvorak' in f[6]]
    faixas_concerto_barroco = [f for f in faixas if f[4] == 'Concerto' and 'Barroco' in f[5]]
    faixas_vivaldi = [f for f in faixas if 'Vivaldi' in f[6]]
    faixas_bach = [f for f in faixas if 'Bach' in f[6]]
    faixas_beethoven = [f for f in faixas if 'Beethoven' in f[6]]
    todas_faixas = list(set((f[0], f[1], f[2]) for f in faixas))
    
    playlists = [
        # Playlist 1: APENAS Concerto + Barroco (para consulta d)
        {
            'nome': 'Concertos Barrocos Puros',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_concerto_barroco[:12]],  # Todas são Concerto+Barroco
        },
        # Playlist 2: Outra playlist 100% Concerto + Barroco
        {
            'nome': 'Barroco em Concerto',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_vivaldi if f[4] == 'Concerto'][:8],
        },
        # Playlist 3: Com Dvorak (para consulta b)
        {
            'nome': 'Favoritos Dvorak',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_dvorak],
        },
        # Playlist 4: Outra com Dvorak
        {
            'nome': 'Sinfonias Eslavas',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_dvorak[:4]],
        },
        # Playlist 5: Mais Dvorak para Deutsche Grammophon liderar
        {
            'nome': 'Novo Mundo Collection',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_dvorak if 'Novo Mundo' in f[3] or 'Violoncelo' in f[3]],
        },
        # Playlist 6: Beethoven (para consulta c - compositor mais tocado)
        {
            'nome': 'Beethoven Essentials',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_beethoven],
        },
        # Playlist 7: Mista geral
        {
            'nome': 'Clássicos Mistos',
            'faixas': random.sample(todas_faixas, min(15, len(todas_faixas))),
        },
        # Playlist 8: Bach intenso (para consulta c)
        {
            'nome': 'Bach Marathon',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_bach],
        },
        # Playlist 9: Vivaldi completo
        {
            'nome': 'Vivaldi Seasons Complete',
            'faixas': [(f[0], f[1], f[2]) for f in faixas_vivaldi],
        },
        # Playlist 10: Românticos
        {
            'nome': 'Romantismo em Foco',
            'faixas': [(f[0], f[1], f[2]) for f in faixas if f[5] == 'Romântico'][:10],
        },
    ]
    
    for pl in playlists:
        if not pl['faixas']:
            continue
            
        # Inserir playlist
        cursor.execute(
            "INSERT INTO PLAYLIST (nome, data_criacao, tempo_total_execucao) VALUES (?, GETDATE(), 0)",
            (pl['nome'],)
        )
        cod_playlist = cursor.execute("SELECT @@IDENTITY").fetchone()[0]
        
        # Inserir faixas e calcular tempo total
        tempo_total = 0
        for ordem, (cod_album, num_unidade, num_faixa) in enumerate(pl['faixas'], 1):
            cursor.execute("""
                INSERT INTO PLAYLIST_FAIXA (cod_playlist, cod_album, numero_unidade, 
                                           numero_faixa, ordem_reproducao, num_vezes_tocada)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cod_playlist, cod_album, num_unidade, num_faixa, ordem, random.randint(0, 50)))
            
            cursor.execute(
                "SELECT tempo_execucao FROM FAIXA WHERE cod_album = ? AND numero_unidade = ? AND numero_faixa = ?",
                (cod_album, num_unidade, num_faixa)
            )
            tempo = cursor.fetchone()
            if tempo:
                tempo_total += tempo[0]
        
        # Atualizar tempo total
        cursor.execute(
            "UPDATE PLAYLIST SET tempo_total_execucao = ? WHERE cod_playlist = ?",
            (tempo_total, cod_playlist)
        )
    
    print(f"  {len([p for p in playlists if p['faixas']])} playlists inseridas")

def executar_povoamento():
    """Executa todo o povoamento"""
    print("\n" + "="*60)
    print("POVOAMENTO DO BANCO DE DADOS BDSPOTPER")
    print("="*60 + "\n")
    
    conexao = get_conexao()
    cursor = conexao.cursor()
    
    try:
        limpar_dados(cursor)
        conexao.commit()
        
        povoar_periodos(cursor)
        conexao.commit()
        
        povoar_compositores(cursor)
        conexao.commit()
        
        povoar_interpretes(cursor)
        conexao.commit()
        
        povoar_tipos_composicao(cursor)
        conexao.commit()
        
        povoar_gravadoras(cursor)
        conexao.commit()
        
        povoar_albuns_e_faixas(cursor)
        conexao.commit()
        
        povoar_playlists(cursor)
        conexao.commit()
        
        print("\n" + "="*60)
        print("POVOAMENTO CONCLUÍDO COM SUCESSO!")
        print("="*60)
        print("\nDados inseridos para testar:")
        print("  - Consulta a: Álbuns com preços variados (35-320 reais)")
        print("  - Consulta b: Múltiplas playlists com faixas de Dvorak")
        print("  - Consulta c: Compositores com várias faixas em playlists")
        print("  - Consulta d: Playlists 100% Concerto + Barroco")
        print("  - Triggers: Barroco+DDD, 64 faixas, preço máximo, etc.")
        
        return True
        
    except Exception as e:
        print(f"\nERRO: {e}")
        conexao.rollback()
        return False
        
    finally:
        cursor.close()
        conexao.close()

if __name__ == "__main__":
    executar_povoamento()
