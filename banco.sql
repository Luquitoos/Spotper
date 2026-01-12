USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'BDSpotPer')
BEGIN
    ALTER DATABASE BDSpotPer SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE BDSpotPer;
END
GO

CREATE DATABASE BDSpotPer
ON PRIMARY 
(
    NAME = 'BDSpotPer_Primary',
    FILENAME = 'C:\SQLData\BDSpotPer_Primary.mdf',
    SIZE = 50MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 10MB
),
FILEGROUP FG_GERAL
(
    NAME = 'BDSpotPer_Geral_01',
    FILENAME = 'C:\SQLData\BDSpotPer_Geral_01.ndf',
    SIZE = 50MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 10MB
),
(
    NAME = 'BDSpotPer_Geral_02',
    FILENAME = 'C:\SQLData\BDSpotPer_Geral_02.ndf',
    SIZE = 50MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 10MB
),
FILEGROUP FG_PLAYLISTS
(
    NAME = 'BDSpotPer_Playlists_01',
    FILENAME = 'C:\SQLData\BDSpotPer_Playlists_01.ndf',
    SIZE = 50MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 10MB
)
LOG ON
(
    NAME = 'BDSpotPer_Log',
    FILENAME = 'C:\SQLLogs\BDSpotPer_Log.ldf',
    SIZE = 25MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 5MB
);
GO

USE BDSpotPer;
GO

SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

CREATE TABLE dbo.GRAVADORA
(
    cod_gravadora   INT IDENTITY(1,1) PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    endereco        VARCHAR(300) NULL,
    homepage        VARCHAR(200) NULL
) ON FG_GERAL;
GO

CREATE TABLE dbo.TELEFONE_GRAVADORA
(
    cod_gravadora   INT NOT NULL,
    telefone        VARCHAR(15) NOT NULL,
    tipo_telefone   VARCHAR(15) NULL,
    
    CONSTRAINT PK_TELEFONE_GRAVADORA 
        PRIMARY KEY (cod_gravadora, telefone),
    
    CONSTRAINT VERIFICAR_TELEFONE_TIPO 
        CHECK (tipo_telefone IS NULL OR tipo_telefone IN ('Fixo', 'Celular', 'WhatsApp', 'Comercial')),
    
    CONSTRAINT FK_TELEFONE_GRAVADORA 
        FOREIGN KEY (cod_gravadora) 
        REFERENCES dbo.GRAVADORA(cod_gravadora)
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ON FG_GERAL;
GO

CREATE TABLE dbo.PERIODO_MUSICAL
(
    cod_periodo INT IDENTITY(1,1) PRIMARY KEY,
    descricao   VARCHAR(60) NOT NULL UNIQUE,
    ano_inicio  SMALLINT NOT NULL,
    ano_fim     SMALLINT NOT NULL,
    
    CONSTRAINT VERIFICAR_PERIODO_ANOS 
        CHECK (ano_fim >= ano_inicio)
) ON FG_GERAL;
GO

CREATE TABLE dbo.COMPOSITOR
(
    cod_compositor    INT IDENTITY(1,1) PRIMARY KEY,
    nome              VARCHAR(120) NOT NULL,
    cidade_nascimento VARCHAR(80) NULL,
    pais_nascimento   VARCHAR(60) NULL,
    data_nascimento   DATE NOT NULL,
    data_morte        DATE NULL,
    cod_periodo       INT NOT NULL,
    
    CONSTRAINT FK_COMPOSITOR_PERIODO 
        FOREIGN KEY (cod_periodo) 
        REFERENCES dbo.PERIODO_MUSICAL(cod_periodo)
        ON DELETE NO ACTION 
        ON UPDATE CASCADE,
    
    CONSTRAINT VERIFICAR_COMPOSITOR_DATAS 
        CHECK (data_morte IS NULL OR data_morte >= data_nascimento)
) ON FG_GERAL;
GO

CREATE INDEX indice_compositor_periodo 
    ON dbo.COMPOSITOR(cod_periodo) 
    ON FG_GERAL;
GO

CREATE INDEX indice_compositor_nome 
    ON dbo.COMPOSITOR(nome) 
    ON FG_GERAL;
GO

CREATE TABLE dbo.TIPO_COMPOSICAO
(
    cod_tipo_composicao INT IDENTITY(1,1) PRIMARY KEY,
    descricao           VARCHAR(60) NOT NULL UNIQUE
) ON FG_GERAL;
GO

CREATE TABLE dbo.INTERPRETE
(
    cod_interprete  INT IDENTITY(1,1) PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    tipo            VARCHAR(40) NOT NULL
) ON FG_GERAL;
GO

CREATE INDEX indice_interprete_tipo 
    ON dbo.INTERPRETE(tipo) 
    ON FG_GERAL;
GO

CREATE TABLE dbo.ALBUM
(
    cod_album       INT IDENTITY(1,1) PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    descricao       VARCHAR(400) NOT NULL,
    cod_gravadora   INT NOT NULL,
    preco_compra    DECIMAL(10,2) NOT NULL,
    data_compra     DATE NOT NULL,
    data_gravacao   DATE NOT NULL,
    tipo_compra     VARCHAR(40) NOT NULL,
    tipo_midia      VARCHAR(10) NOT NULL,
    qtd_unidades    TINYINT NOT NULL DEFAULT 1,
    
    CONSTRAINT FK_ALBUM_GRAVADORA 
        FOREIGN KEY (cod_gravadora) 
        REFERENCES dbo.GRAVADORA(cod_gravadora)
        ON DELETE NO ACTION 
        ON UPDATE CASCADE,
    
    CONSTRAINT VERIFICAR_ALBUM_PRECO 
        CHECK (preco_compra > 0),
    
    CONSTRAINT VERIFICAR_ALBUM_DATA_GRAVACAO 
        CHECK (data_gravacao > '2000-01-01'),
    
    CONSTRAINT VERIFICAR_ALBUM_TIPO_MIDIA 
        CHECK (tipo_midia IN ('CD', 'VINIL', 'DOWNLOAD')),
    
    CONSTRAINT VERIFICAR_ALBUM_QTD_UNIDADES 
        CHECK (qtd_unidades >= 1),
    
    CONSTRAINT VERIFICAR_DOWNLOAD_UNIDADE_UNICA 
        CHECK (tipo_midia <> 'DOWNLOAD' OR qtd_unidades = 1)
) ON FG_GERAL;
GO

CREATE INDEX indice_album_gravadora 
    ON dbo.ALBUM(cod_gravadora) 
    ON FG_GERAL;
GO

CREATE INDEX indice_album_tipo_midia 
    ON dbo.ALBUM(tipo_midia) 
    ON FG_GERAL;
GO

CREATE TABLE dbo.FAIXA
(
    cod_album           INT NOT NULL,
    numero_unidade      TINYINT NOT NULL DEFAULT 1,
    numero_faixa        TINYINT NOT NULL,
    descricao           VARCHAR(200) NOT NULL,
    cod_tipo_composicao INT NOT NULL,
    tempo_execucao      SMALLINT NOT NULL,
    tipo_gravacao       VARCHAR(3) NULL,

    CONSTRAINT PK_FAIXA 
        PRIMARY KEY NONCLUSTERED (cod_album, numero_unidade, numero_faixa),

    CONSTRAINT FK_FAIXA_ALBUM 
        FOREIGN KEY (cod_album)
        REFERENCES dbo.ALBUM(cod_album)
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    CONSTRAINT FK_FAIXA_TIPO_COMPOSICAO 
        FOREIGN KEY (cod_tipo_composicao)
        REFERENCES dbo.TIPO_COMPOSICAO(cod_tipo_composicao)
        ON DELETE NO ACTION 
        ON UPDATE CASCADE,

    CONSTRAINT VERIFICAR_FAIXA_NUMERO_UNIDADE 
        CHECK (numero_unidade >= 1),

    CONSTRAINT VERIFICAR_FAIXA_NUMERO_FAIXA 
        CHECK (numero_faixa >= 1),

    CONSTRAINT VERIFICAR_FAIXA_TEMPO 
        CHECK (tempo_execucao > 0),

    CONSTRAINT VERIFICAR_FAIXA_TIPO_GRAVACAO 
        CHECK (tipo_gravacao IS NULL OR tipo_gravacao IN ('ADD', 'DDD'))
) ON FG_PLAYLISTS;
GO

CREATE CLUSTERED INDEX indice_faixa_album
    ON dbo.FAIXA(cod_album)
    WITH (FILLFACTOR = 100)
    ON FG_PLAYLISTS;
GO

CREATE NONCLUSTERED INDEX indice_faixa_tipo_composicao
    ON dbo.FAIXA(cod_tipo_composicao)
    WITH (FILLFACTOR = 100)
    ON FG_PLAYLISTS;
GO

CREATE TABLE dbo.PLAYLIST
(
    cod_playlist         INT IDENTITY(1,1) PRIMARY KEY,
    nome                 VARCHAR(150) NOT NULL,
    data_criacao         DATE NOT NULL DEFAULT GETDATE(),
    tempo_total_execucao INT NOT NULL DEFAULT 0
) ON FG_PLAYLISTS;
GO

CREATE TABLE dbo.FAIXA_COMPOSITOR
(
    cod_album       INT NOT NULL,
    numero_unidade  TINYINT NOT NULL,
    numero_faixa    TINYINT NOT NULL,
    cod_compositor  INT NOT NULL,

    CONSTRAINT PK_FAIXA_COMPOSITOR 
        PRIMARY KEY (cod_album, numero_unidade, numero_faixa, cod_compositor),

    CONSTRAINT FK_FAIXA_COMPOSITOR_FAIXA 
        FOREIGN KEY (cod_album, numero_unidade, numero_faixa)
        REFERENCES dbo.FAIXA(cod_album, numero_unidade, numero_faixa)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_FAIXA_COMPOSITOR_COMPOSITOR 
        FOREIGN KEY (cod_compositor)
        REFERENCES dbo.COMPOSITOR(cod_compositor)
        ON DELETE NO ACTION
        ON UPDATE CASCADE
) ON FG_PLAYLISTS;
GO

CREATE INDEX indice_faixa_compositor_compositor 
    ON dbo.FAIXA_COMPOSITOR(cod_compositor) 
    ON FG_PLAYLISTS;
GO

CREATE TABLE dbo.FAIXA_INTERPRETE
(
    cod_album       INT NOT NULL,
    numero_unidade  TINYINT NOT NULL,
    numero_faixa    TINYINT NOT NULL,
    cod_interprete  INT NOT NULL,

    CONSTRAINT PK_FAIXA_INTERPRETE 
        PRIMARY KEY (cod_album, numero_unidade, numero_faixa, cod_interprete),

    CONSTRAINT FK_FAIXA_INTERPRETE_FAIXA 
        FOREIGN KEY (cod_album, numero_unidade, numero_faixa)
        REFERENCES dbo.FAIXA(cod_album, numero_unidade, numero_faixa)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT FK_FAIXA_INTERPRETE_INTERPRETE 
        FOREIGN KEY (cod_interprete)
        REFERENCES dbo.INTERPRETE(cod_interprete)
        ON DELETE NO ACTION
        ON UPDATE CASCADE
) ON FG_PLAYLISTS;
GO

CREATE INDEX indice_faixa_interprete_interprete 
    ON dbo.FAIXA_INTERPRETE(cod_interprete) 
    ON FG_PLAYLISTS;
GO

CREATE TABLE dbo.PLAYLIST_FAIXA
(
    cod_playlist            INT NOT NULL,
    cod_album               INT NOT NULL,
    numero_unidade          TINYINT NOT NULL,
    numero_faixa            TINYINT NOT NULL,
    ordem_reproducao        SMALLINT NOT NULL,
    data_ultima_vez_tocada  DATETIME NULL,
    num_vezes_tocada        INT NOT NULL DEFAULT 0,

    CONSTRAINT PK_PLAYLIST_FAIXA
        PRIMARY KEY (cod_playlist, cod_album, numero_unidade, numero_faixa),

    CONSTRAINT FK_PLAYLIST_FAIXA_PLAYLIST 
        FOREIGN KEY (cod_playlist)
        REFERENCES dbo.PLAYLIST(cod_playlist)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT FK_PLAYLIST_FAIXA_FAIXA 
        FOREIGN KEY (cod_album, numero_unidade, numero_faixa)
        REFERENCES dbo.FAIXA(cod_album, numero_unidade, numero_faixa)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT UQ_ORDEM_PLAYLIST 
        UNIQUE (cod_playlist, ordem_reproducao),
    
    CONSTRAINT VERIFICAR_PLAYLIST_FAIXA_ORDEM 
        CHECK (ordem_reproducao >= 1),
    
    CONSTRAINT VERIFICAR_PLAYLIST_FAIXA_VEZES_TOCADA 
        CHECK (num_vezes_tocada >= 0)
) ON FG_PLAYLISTS;
GO

CREATE INDEX indice_playlist_faixa_faixa 
    ON dbo.PLAYLIST_FAIXA(cod_album, numero_unidade, numero_faixa) 
    ON FG_PLAYLISTS;
GO

CREATE VIEW dbo.VW_PLAYLIST_ALBUM_UNICO
WITH SCHEMABINDING
AS
    SELECT 
        pf.cod_playlist,
        pf.cod_album,
        COUNT_BIG(*) AS qtd_faixas_album
    FROM dbo.PLAYLIST_FAIXA AS pf
    GROUP BY pf.cod_playlist, pf.cod_album;
GO

CREATE UNIQUE CLUSTERED INDEX IX_VW_PLAYLIST_ALBUM_UNICO
ON dbo.VW_PLAYLIST_ALBUM_UNICO (cod_playlist, cod_album);
GO

CREATE VIEW dbo.VW_MATERIALIZADA_PLAYLIST_ALBUNS
WITH SCHEMABINDING
AS
    SELECT 
        p.cod_playlist,
        p.nome AS nome_playlist,
        COUNT_BIG(*) AS qtd_albuns
    FROM dbo.PLAYLIST AS p
    INNER JOIN dbo.PLAYLIST_FAIXA AS pf ON p.cod_playlist = pf.cod_playlist
    INNER JOIN dbo.ALBUM AS a ON pf.cod_album = a.cod_album
    GROUP BY p.cod_playlist, p.nome, pf.cod_album;
GO

-- View materializada que conta faixas por playlist/album
-- O COUNT(DISTINCT) não tava funcionando, então fiz a materialização das combinações únicas de playlist-album

CREATE VIEW dbo.VW_MATERIALIZADA_PLAYLIST_QTDALBUNS
WITH SCHEMABINDING
AS
    SELECT 
        p.cod_playlist,
        p.nome AS nome_playlist,
        pf.cod_album,
        COUNT_BIG(*) AS qtd_faixas
    FROM dbo.PLAYLIST AS p
    INNER JOIN dbo.PLAYLIST_FAIXA AS pf ON p.cod_playlist = pf.cod_playlist
    GROUP BY p.cod_playlist, p.nome, pf.cod_album;
GO

CREATE UNIQUE CLUSTERED INDEX IX_VW_MATERIALIZADA_PLAYLIST_QTDALBUNS
ON dbo.VW_MATERIALIZADA_PLAYLIST_QTDALBUNS (cod_playlist, cod_album);
GO

CREATE VIEW dbo.PLAYLIST_QUANTIDADE_ALBUNS
AS
    SELECT 
        nome_playlist,
        COUNT(*) AS qtd_albuns
    FROM dbo.VW_MATERIALIZADA_PLAYLIST_QTDALBUNS WITH (NOEXPAND)
    GROUP BY cod_playlist, nome_playlist;
GO

CREATE TRIGGER VALIDAR_TIPO_GRAVACAO_FAIXA
ON dbo.FAIXA
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.ALBUM alb ON ins.cod_album = alb.cod_album
    WHERE alb.tipo_midia = 'CD' 
      AND ins.tipo_gravacao IS NULL;
    
    IF @contador > 0
    BEGIN
        RAISERROR('Faixas de CD devem ter tipo_gravacao (ADD ou DDD).', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.ALBUM alb ON ins.cod_album = alb.cod_album
    WHERE alb.tipo_midia IN ('VINIL', 'DOWNLOAD') 
      AND ins.tipo_gravacao IS NOT NULL;
    
    IF @contador > 0
    BEGIN
        RAISERROR('Faixas de VINIL ou DOWNLOAD nao podem ter tipo_gravacao', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER VALIDAR_NUMERO_UNIDADE_FAIXA
ON dbo.FAIXA
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.ALBUM alb ON ins.cod_album = alb.cod_album
    WHERE alb.tipo_midia = 'DOWNLOAD' 
      AND ins.numero_unidade <> 1;
    
    IF @contador > 0
    BEGIN
        RAISERROR('Downloads so podem ter numero_unidade = 1.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.ALBUM alb ON ins.cod_album = alb.cod_album
    WHERE ins.numero_unidade > alb.qtd_unidades;
    
    IF @contador > 0
    BEGIN
        RAISERROR('numero_unidade excede qtd_unidades do album', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER LIMITE_64_FAIXAS_ALBUM
ON dbo.FAIXA
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @quantidade_faixas INT;
    DECLARE @codigo_album INT;
    
    DECLARE cursor_albuns CURSOR FOR
        SELECT DISTINCT cod_album FROM inserted;
    
    OPEN cursor_albuns;
    FETCH NEXT FROM cursor_albuns INTO @codigo_album;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @quantidade_faixas = COUNT(*)
        FROM dbo.FAIXA
        WHERE cod_album = @codigo_album;
        
        IF @quantidade_faixas > 64
        BEGIN
            CLOSE cursor_albuns;
            DEALLOCATE cursor_albuns;
            RAISERROR('Album nao pode ter mais que 64 faixas.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        FETCH NEXT FROM cursor_albuns INTO @codigo_album;
    END
    
    CLOSE cursor_albuns;
    DEALLOCATE cursor_albuns;
END;
GO

CREATE TRIGGER BARROCO_EXIGE_DDD_FAIXA
ON dbo.FAIXA
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.FAIXA_COMPOSITOR fc 
        ON ins.cod_album = fc.cod_album
        AND ins.numero_unidade = fc.numero_unidade
        AND ins.numero_faixa = fc.numero_faixa
    JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
    JOIN dbo.PERIODO_MUSICAL per ON comp.cod_periodo = per.cod_periodo
    WHERE UPPER(per.descricao) LIKE '%BARROCO%'
      AND (ins.tipo_gravacao IS NULL OR ins.tipo_gravacao <> 'DDD');
    
    IF @contador > 0
    BEGIN
        RAISERROR('Faixas de compositores do periodo Barroco exigem tipo de gravacao DDD.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER BARROCO_EXIGE_DDD_COMPOSITOR
ON dbo.FAIXA_COMPOSITOR
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.COMPOSITOR comp ON ins.cod_compositor = comp.cod_compositor
    JOIN dbo.PERIODO_MUSICAL per ON comp.cod_periodo = per.cod_periodo
    JOIN dbo.FAIXA fax 
        ON ins.cod_album = fax.cod_album
        AND ins.numero_unidade = fax.numero_unidade
        AND ins.numero_faixa = fax.numero_faixa
    WHERE UPPER(per.descricao) LIKE '%BARROCO%'
      AND (fax.tipo_gravacao IS NULL OR fax.tipo_gravacao <> 'DDD');
    
    IF @contador > 0
    BEGIN
        RAISERROR('Nao e possivel associar compositor Barroco a faixa sem tipo_gravacao = DDD.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER VALIDAR_PRECO_ALBUM
ON dbo.ALBUM
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @media_albuns_ddd DECIMAL(10,2);
    DECLARE @preco_maximo DECIMAL(10,2);
    DECLARE @contador INT;

    SELECT @media_albuns_ddd = AVG(alb.preco_compra)
    FROM dbo.ALBUM alb
    WHERE alb.cod_album NOT IN (SELECT cod_album FROM inserted)
      AND (SELECT COUNT(*) FROM dbo.FAIXA WHERE cod_album = alb.cod_album) > 0
      AND (SELECT COUNT(*) FROM dbo.FAIXA WHERE cod_album = alb.cod_album AND (tipo_gravacao IS NULL OR tipo_gravacao <> 'DDD')) = 0;

    IF @media_albuns_ddd IS NULL OR @media_albuns_ddd = 0
        RETURN;

    SET @preco_maximo = 3 * @media_albuns_ddd;

    SELECT @contador = COUNT(*)
    FROM inserted 
    WHERE preco_compra > @preco_maximo;

    IF @contador > 0
    BEGIN
        DECLARE @mensagem VARCHAR(500);
        SET @mensagem = 'Preco de compra excede 3x a media dos albuns DDD (media atual: R$ ' 
                       + CAST(@media_albuns_ddd AS VARCHAR(20)) + ').';
        RAISERROR(@mensagem, 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER IMPEDIR_ALTERACAO_TIPO_MIDIA
ON dbo.ALBUM
AFTER UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    IF UPDATE(tipo_midia)
    BEGIN
        SELECT @contador = COUNT(*)
        FROM inserted ins
        JOIN deleted del ON ins.cod_album = del.cod_album
        WHERE ins.tipo_midia <> del.tipo_midia;
        
        IF @contador > 0
        BEGIN
            RAISERROR('Nao e permitido alterar o tipo de midia do album apos criacao.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
    END
END;
GO

CREATE TRIGGER ATUALIZAR_TEMPO_PLAYLIST
ON dbo.PLAYLIST_FAIXA
AFTER INSERT, DELETE
AS
BEGIN
    DECLARE @cod_playlist_atual INT;
    DECLARE @tempo_total INT;
    
    DECLARE cursor_playlists CURSOR FOR
        SELECT cod_playlist FROM inserted 
        UNION 
        SELECT cod_playlist FROM deleted;
    
    OPEN cursor_playlists;
    FETCH NEXT FROM cursor_playlists INTO @cod_playlist_atual;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @tempo_total = SUM(fax.tempo_execucao)
        FROM dbo.PLAYLIST_FAIXA pf
        JOIN dbo.FAIXA fax 
            ON pf.cod_album = fax.cod_album
            AND pf.numero_unidade = fax.numero_unidade
            AND pf.numero_faixa = fax.numero_faixa
        WHERE pf.cod_playlist = @cod_playlist_atual;
        
        UPDATE dbo.PLAYLIST
        SET tempo_total_execucao = ISNULL(@tempo_total, 0)
        WHERE cod_playlist = @cod_playlist_atual;
        
        FETCH NEXT FROM cursor_playlists INTO @cod_playlist_atual;
    END
    
    CLOSE cursor_playlists;
    DEALLOCATE cursor_playlists;
END;
GO

CREATE TRIGGER BARROCO_PERIODO_UPDATE
ON dbo.COMPOSITOR
AFTER UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    IF NOT UPDATE(cod_periodo)
        RETURN;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.PERIODO_MUSICAL per ON ins.cod_periodo = per.cod_periodo
    JOIN dbo.FAIXA_COMPOSITOR fc ON ins.cod_compositor = fc.cod_compositor
    JOIN dbo.FAIXA fax 
        ON fc.cod_album = fax.cod_album
        AND fc.numero_unidade = fax.numero_unidade
        AND fc.numero_faixa = fax.numero_faixa
    WHERE UPPER(per.descricao) LIKE '%BARROCO%'
      AND (fax.tipo_gravacao IS NULL OR fax.tipo_gravacao <> 'DDD');
    
    IF @contador > 0
    BEGIN
        RAISERROR('Compositor alterado para Barroco possui faixas sem tipo_gravacao DDD.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER BARROCO_FAIXA_UPDATE_GRAVACAO
ON dbo.FAIXA
AFTER UPDATE
AS
BEGIN
    DECLARE @contador INT;
    
    IF NOT UPDATE(tipo_gravacao)
        RETURN;
    
    SELECT @contador = COUNT(*)
    FROM inserted ins
    JOIN dbo.FAIXA_COMPOSITOR fc 
        ON ins.cod_album = fc.cod_album
        AND ins.numero_unidade = fc.numero_unidade
        AND ins.numero_faixa = fc.numero_faixa
    JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
    JOIN dbo.PERIODO_MUSICAL per ON comp.cod_periodo = per.cod_periodo
    WHERE UPPER(per.descricao) LIKE '%BARROCO%'
      AND (ins.tipo_gravacao IS NULL OR ins.tipo_gravacao <> 'DDD');
    
    IF @contador > 0
    BEGIN
        RAISERROR('Nao e permitido remover tipo_gravacao DDD de faixa com compositor Barroco.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

CREATE TRIGGER VALIDAR_PRECO_APOS_FAIXA
ON dbo.FAIXA
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    DECLARE @media_albuns_ddd DECIMAL(10,2);
    DECLARE @codigo_album INT;
    DECLARE @preco_album DECIMAL(10,2);
    DECLARE @preco_maximo DECIMAL(10,2);

    DECLARE @albuns_afetados TABLE (cod_album INT);

    INSERT INTO @albuns_afetados (cod_album)
    SELECT cod_album FROM inserted
    UNION
    SELECT cod_album FROM deleted;

    SELECT @media_albuns_ddd = AVG(alb.preco_compra)
    FROM dbo.ALBUM alb
    WHERE alb.cod_album NOT IN (SELECT cod_album FROM @albuns_afetados)
      AND (SELECT COUNT(*) FROM dbo.FAIXA WHERE cod_album = alb.cod_album) > 0
      AND (SELECT COUNT(*) FROM dbo.FAIXA WHERE cod_album = alb.cod_album AND (tipo_gravacao IS NULL OR tipo_gravacao <> 'DDD')) = 0;

    IF @media_albuns_ddd IS NULL OR @media_albuns_ddd = 0
        RETURN;

    SET @preco_maximo = 3 * @media_albuns_ddd;

    DECLARE cursor_albuns CURSOR FOR
        SELECT cod_album FROM @albuns_afetados;

    OPEN cursor_albuns;
    FETCH NEXT FROM cursor_albuns INTO @codigo_album;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @preco_album = preco_compra
        FROM dbo.ALBUM
        WHERE cod_album = @codigo_album;

        IF @preco_album > @preco_maximo
        BEGIN
            CLOSE cursor_albuns;
            DEALLOCATE cursor_albuns;
            RAISERROR('Preco do album excede 3x a media dos albuns com todas as faixas DDD.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        FETCH NEXT FROM cursor_albuns INTO @codigo_album;
    END

    CLOSE cursor_albuns;
    DEALLOCATE cursor_albuns;
END;
GO

CREATE FUNCTION dbo.BUSCAR_ALBUNS_POR_COMPOSITOR
(
    @nome_compositor VARCHAR(150)
)
RETURNS TABLE
AS
RETURN
(
    SELECT DISTINCT 
        alb.cod_album,
        alb.nome AS nome_album,
        alb.descricao,
        grav.nome AS gravadora,
        alb.tipo_midia,
        alb.preco_compra,
        alb.data_compra,
        alb.data_gravacao,
        alb.tipo_compra,
        alb.qtd_unidades
    FROM dbo.ALBUM alb
    JOIN dbo.GRAVADORA grav ON alb.cod_gravadora = grav.cod_gravadora
    JOIN dbo.FAIXA fax ON fax.cod_album = alb.cod_album
    JOIN dbo.FAIXA_COMPOSITOR fc 
        ON fax.cod_album = fc.cod_album
        AND fax.numero_unidade = fc.numero_unidade
        AND fax.numero_faixa = fc.numero_faixa
    JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
    WHERE comp.nome LIKE '%' + @nome_compositor + '%'
);
GO


CREATE PROCEDURE dbo.REGISTRAR_REPRODUCAO
    @param_cod_playlist INT,
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT
AS
BEGIN
    DECLARE @linhas_afetadas INT;
    
    UPDATE dbo.PLAYLIST_FAIXA
    SET data_ultima_vez_tocada = GETDATE(),
        num_vezes_tocada = num_vezes_tocada + 1
    WHERE cod_playlist = @param_cod_playlist 
      AND cod_album = @param_cod_album
      AND numero_unidade = @param_numero_unidade
      AND numero_faixa = @param_numero_faixa;
    
    SET @linhas_afetadas = @@ROWCOUNT;
    
    IF @linhas_afetadas = 0
        RAISERROR('Faixa nao encontrada na playlist.', 16, 1);
END;
GO

CREATE PROCEDURE dbo.INSERIR_ALBUM
    @param_nome VARCHAR(150),
    @param_descricao VARCHAR(400),
    @param_cod_gravadora INT,
    @param_preco_compra DECIMAL(10,2),
    @param_data_compra DATE,
    @param_data_gravacao DATE,
    @param_tipo_compra VARCHAR(40),
    @param_tipo_midia VARCHAR(10),
    @param_qtd_unidades TINYINT = 1,
    @param_cod_album_saida INT OUTPUT
AS
BEGIN
    BEGIN TRANSACTION;
    
    BEGIN TRY
        INSERT INTO dbo.ALBUM (nome, descricao, cod_gravadora, preco_compra, 
                               data_compra, data_gravacao, tipo_compra, 
                               tipo_midia, qtd_unidades)
        VALUES (@param_nome, @param_descricao, @param_cod_gravadora, @param_preco_compra,
                @param_data_compra, @param_data_gravacao, @param_tipo_compra, 
                @param_tipo_midia, @param_qtd_unidades);
        
        SET @param_cod_album_saida = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 
            ROLLBACK TRANSACTION;
        
        DECLARE @mensagem_erro VARCHAR(500);
        SET @mensagem_erro = ERROR_MESSAGE();
        RAISERROR(@mensagem_erro, 16, 1);
    END CATCH
END;
GO

CREATE PROCEDURE dbo.INSERIR_FAIXA
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT,
    @param_descricao VARCHAR(200),
    @param_cod_tipo_composicao INT,
    @param_tempo_execucao SMALLINT,
    @param_tipo_gravacao VARCHAR(3) = NULL
AS
BEGIN
    DECLARE @faixa_existe INT;
    DECLARE @faixa_anterior_existe INT;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        SELECT @faixa_existe = COUNT(*)
        FROM dbo.FAIXA
        WHERE cod_album = @param_cod_album
          AND numero_unidade = @param_numero_unidade
          AND numero_faixa = @param_numero_faixa;
        
        IF @faixa_existe > 0
        BEGIN
            RAISERROR('Faixa ja existe neste album/unidade.', 16, 1);
        END
        
        IF @param_numero_faixa > 1
        BEGIN
            SELECT @faixa_anterior_existe = COUNT(*)
            FROM dbo.FAIXA
            WHERE cod_album = @param_cod_album
              AND numero_unidade = @param_numero_unidade
              AND numero_faixa = @param_numero_faixa - 1;
            
            IF @faixa_anterior_existe = 0
            BEGIN
                RAISERROR('Sequencia de faixas invalida. Insira as faixas em ordem.', 16, 1);
            END
        END
        
        INSERT INTO dbo.FAIXA (cod_album, numero_unidade, numero_faixa, 
                               descricao, cod_tipo_composicao, 
                               tempo_execucao, tipo_gravacao)
        VALUES (@param_cod_album, @param_numero_unidade, @param_numero_faixa, 
                @param_descricao, @param_cod_tipo_composicao, 
                @param_tempo_execucao, @param_tipo_gravacao);
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 
            ROLLBACK TRANSACTION;
        
        DECLARE @mensagem_erro VARCHAR(500);
        SET @mensagem_erro = ERROR_MESSAGE();
        RAISERROR(@mensagem_erro, 16, 1);
    END CATCH
END;
GO

CREATE PROCEDURE dbo.ASSOCIAR_COMPOSITOR_FAIXA
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT,
    @param_cod_compositor INT
AS
BEGIN
    DECLARE @faixa_existe INT;
    DECLARE @compositor_existe INT;
    
    SELECT @faixa_existe = COUNT(*)
    FROM dbo.FAIXA 
    WHERE cod_album = @param_cod_album 
      AND numero_unidade = @param_numero_unidade 
      AND numero_faixa = @param_numero_faixa;
    
    IF @faixa_existe = 0
    BEGIN
        RAISERROR('Faixa nao encontrada.', 16, 1);
        RETURN;
    END
    
    SELECT @compositor_existe = COUNT(*)
    FROM dbo.COMPOSITOR 
    WHERE cod_compositor = @param_cod_compositor;
    
    IF @compositor_existe = 0
    BEGIN
        RAISERROR('Compositor nao encontrado.', 16, 1);
        RETURN;
    END
    
    INSERT INTO dbo.FAIXA_COMPOSITOR (cod_album, numero_unidade, numero_faixa, cod_compositor)
    VALUES (@param_cod_album, @param_numero_unidade, @param_numero_faixa, @param_cod_compositor);
END;
GO

CREATE PROCEDURE dbo.ASSOCIAR_INTERPRETE_FAIXA
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT,
    @param_cod_interprete INT
AS
BEGIN
    DECLARE @faixa_existe INT;
    DECLARE @interprete_existe INT;
    
    SELECT @faixa_existe = COUNT(*)
    FROM dbo.FAIXA 
    WHERE cod_album = @param_cod_album 
      AND numero_unidade = @param_numero_unidade 
      AND numero_faixa = @param_numero_faixa;
    
    IF @faixa_existe = 0
    BEGIN
        RAISERROR('Faixa nao encontrada.', 16, 1);
        RETURN;
    END
    
    SELECT @interprete_existe = COUNT(*)
    FROM dbo.INTERPRETE 
    WHERE cod_interprete = @param_cod_interprete;
    
    IF @interprete_existe = 0
    BEGIN
        RAISERROR('Interprete nao encontrado.', 16, 1);
        RETURN;
    END
    
    INSERT INTO dbo.FAIXA_INTERPRETE (cod_album, numero_unidade, numero_faixa, cod_interprete)
    VALUES (@param_cod_album, @param_numero_unidade, @param_numero_faixa, @param_cod_interprete);
END;
GO

CREATE PROCEDURE dbo.CRIAR_PLAYLIST
    @param_nome VARCHAR(150),
    @param_cod_playlist_saida INT OUTPUT
AS
BEGIN
    BEGIN TRANSACTION;
    
    BEGIN TRY
        INSERT INTO dbo.PLAYLIST (nome, data_criacao, tempo_total_execucao)
        VALUES (@param_nome, GETDATE(), 0);
        
        SET @param_cod_playlist_saida = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 
            ROLLBACK TRANSACTION;
        
        DECLARE @mensagem_erro VARCHAR(500);
        SET @mensagem_erro = ERROR_MESSAGE();
        RAISERROR(@mensagem_erro, 16, 1);
    END CATCH
END;
GO

CREATE PROCEDURE dbo.ADICIONAR_FAIXA_PLAYLIST
    @param_cod_playlist INT,
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT
AS
BEGIN
    DECLARE @playlist_existe INT;
    DECLARE @faixa_existe INT;
    DECLARE @ja_na_playlist INT;
    DECLARE @proxima_ordem SMALLINT;
    
    SELECT @playlist_existe = COUNT(*)
    FROM dbo.PLAYLIST 
    WHERE cod_playlist = @param_cod_playlist;
    
    IF @playlist_existe = 0
    BEGIN
        RAISERROR('Playlist nao encontrada.', 16, 1);
        RETURN;
    END
    
    SELECT @faixa_existe = COUNT(*)
    FROM dbo.FAIXA 
    WHERE cod_album = @param_cod_album 
      AND numero_unidade = @param_numero_unidade 
      AND numero_faixa = @param_numero_faixa;
    
    IF @faixa_existe = 0
    BEGIN
        RAISERROR('Faixa nao encontrada.', 16, 1);
        RETURN;
    END
    
    SELECT @ja_na_playlist = COUNT(*)
    FROM dbo.PLAYLIST_FAIXA 
    WHERE cod_playlist = @param_cod_playlist 
      AND cod_album = @param_cod_album
      AND numero_unidade = @param_numero_unidade
      AND numero_faixa = @param_numero_faixa;
    
    IF @ja_na_playlist > 0
    BEGIN
        RAISERROR('Faixa ja esta na playlist.', 16, 1);
        RETURN;
    END
    
    SELECT @proxima_ordem = ISNULL(MAX(ordem_reproducao), 0) + 1
    FROM dbo.PLAYLIST_FAIXA
    WHERE cod_playlist = @param_cod_playlist;
    
    INSERT INTO dbo.PLAYLIST_FAIXA (cod_playlist, cod_album, numero_unidade, 
                                     numero_faixa, ordem_reproducao, num_vezes_tocada)
    VALUES (@param_cod_playlist, @param_cod_album, @param_numero_unidade, 
            @param_numero_faixa, @proxima_ordem, 0);
END;
GO

CREATE PROCEDURE dbo.REMOVER_FAIXA_PLAYLIST
    @param_cod_playlist INT,
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT
AS
BEGIN
    DECLARE @linhas_afetadas INT;
    
    DELETE FROM dbo.PLAYLIST_FAIXA
    WHERE cod_playlist = @param_cod_playlist 
      AND cod_album = @param_cod_album
      AND numero_unidade = @param_numero_unidade
      AND numero_faixa = @param_numero_faixa;
    
    SET @linhas_afetadas = @@ROWCOUNT;
    
    IF @linhas_afetadas = 0
        RAISERROR('Faixa nao encontrada na playlist.', 16, 1);
END;
GO

CREATE PROCEDURE dbo.LISTAR_ALBUNS
AS
BEGIN
    SELECT 
        alb.cod_album,
        alb.nome AS nome_album,
        alb.descricao,
        grav.nome AS gravadora,
        alb.tipo_midia,
        alb.preco_compra,
        alb.data_gravacao,
        (SELECT COUNT(*) FROM dbo.FAIXA fax WHERE fax.cod_album = alb.cod_album) AS qtd_faixas
    FROM dbo.ALBUM alb
    JOIN dbo.GRAVADORA grav ON alb.cod_gravadora = grav.cod_gravadora
    ORDER BY alb.nome;
END;
GO

CREATE PROCEDURE dbo.LISTAR_FAIXAS_ALBUM
    @param_cod_album INT
AS
BEGIN
    SELECT 
        fax.cod_album,
        fax.numero_unidade,
        fax.numero_faixa,
        fax.descricao,
        tc.descricao AS tipo_composicao,
        fax.tempo_execucao,
        fax.tipo_gravacao
    FROM dbo.FAIXA fax
    JOIN dbo.TIPO_COMPOSICAO tc ON fax.cod_tipo_composicao = tc.cod_tipo_composicao
    WHERE fax.cod_album = @param_cod_album
    ORDER BY fax.numero_unidade, fax.numero_faixa;
END;
GO

CREATE PROCEDURE dbo.LISTAR_COMPOSITORES_FAIXA
    @param_cod_album INT,
    @param_numero_unidade TINYINT,
    @param_numero_faixa TINYINT
AS
BEGIN
    SELECT comp.nome
    FROM dbo.FAIXA_COMPOSITOR fc
    JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
    WHERE fc.cod_album = @param_cod_album
      AND fc.numero_unidade = @param_numero_unidade
      AND fc.numero_faixa = @param_numero_faixa
    ORDER BY comp.nome;
END;
GO

CREATE PROCEDURE dbo.LISTAR_PLAYLISTS
AS
BEGIN
    SELECT 
        play.cod_playlist,
        play.nome,
        play.data_criacao,
        play.tempo_total_execucao,
        (SELECT COUNT(*) FROM dbo.PLAYLIST_FAIXA pf WHERE pf.cod_playlist = play.cod_playlist) AS qtd_faixas
    FROM dbo.PLAYLIST play
    ORDER BY play.nome;
END;
GO

CREATE PROCEDURE dbo.LISTAR_FAIXAS_PLAYLIST
    @param_cod_playlist INT
AS
BEGIN
    SELECT 
        pf.ordem_reproducao,
        pf.cod_album,
        pf.numero_unidade,
        pf.numero_faixa,
        fax.descricao AS nome_faixa,
        alb.nome AS nome_album,
        tc.descricao AS tipo_composicao,
        fax.tempo_execucao,
        pf.data_ultima_vez_tocada,
        pf.num_vezes_tocada
    FROM dbo.PLAYLIST_FAIXA pf
    JOIN dbo.FAIXA fax 
        ON pf.cod_album = fax.cod_album
        AND pf.numero_unidade = fax.numero_unidade
        AND pf.numero_faixa = fax.numero_faixa
    JOIN dbo.ALBUM alb ON fax.cod_album = alb.cod_album
    JOIN dbo.TIPO_COMPOSICAO tc ON fax.cod_tipo_composicao = tc.cod_tipo_composicao
    WHERE pf.cod_playlist = @param_cod_playlist
    ORDER BY pf.ordem_reproducao;
END;
GO


CREATE VIEW dbo.ALBUNS_ACIMA_MEDIA
AS
SELECT 
    alb.cod_album,
    alb.nome,
    alb.descricao,
    grav.nome AS gravadora,
    alb.preco_compra,
    alb.tipo_midia,
    alb.data_compra,
    alb.data_gravacao,
    (SELECT AVG(preco_compra) FROM dbo.ALBUM) AS media_geral
FROM dbo.ALBUM alb
JOIN dbo.GRAVADORA grav ON alb.cod_gravadora = grav.cod_gravadora
WHERE alb.preco_compra > (SELECT AVG(preco_compra) FROM dbo.ALBUM);
GO

CREATE VIEW dbo.GRAVADORA_MAIS_PLAYLISTS_DVORAK
AS
SELECT 
    grav.nome AS gravadora,
    COUNT(DISTINCT pf.cod_playlist) AS qtd_playlists
FROM dbo.GRAVADORA grav
JOIN dbo.ALBUM alb ON grav.cod_gravadora = alb.cod_gravadora
JOIN dbo.FAIXA fax ON alb.cod_album = fax.cod_album
JOIN dbo.FAIXA_COMPOSITOR fc 
    ON fax.cod_album = fc.cod_album
    AND fax.numero_unidade = fc.numero_unidade
    AND fax.numero_faixa = fc.numero_faixa
JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
JOIN dbo.PLAYLIST_FAIXA pf 
    ON fax.cod_album = pf.cod_album
    AND fax.numero_unidade = pf.numero_unidade
    AND fax.numero_faixa = pf.numero_faixa
WHERE comp.nome LIKE '%Dvorak%' 
   OR comp.nome LIKE '%Dvorák%' 
   OR comp.nome LIKE '%Dvorack%'
GROUP BY grav.nome
HAVING COUNT(DISTINCT pf.cod_playlist) >= ALL (
    SELECT COUNT(DISTINCT pf2.cod_playlist)
    FROM dbo.GRAVADORA grav2
    JOIN dbo.ALBUM alb2 ON grav2.cod_gravadora = alb2.cod_gravadora
    JOIN dbo.FAIXA fax2 ON alb2.cod_album = fax2.cod_album
    JOIN dbo.FAIXA_COMPOSITOR fc2 
        ON fax2.cod_album = fc2.cod_album
        AND fax2.numero_unidade = fc2.numero_unidade
        AND fax2.numero_faixa = fc2.numero_faixa
    JOIN dbo.COMPOSITOR comp2 ON fc2.cod_compositor = comp2.cod_compositor
    JOIN dbo.PLAYLIST_FAIXA pf2 
        ON fax2.cod_album = pf2.cod_album
        AND fax2.numero_unidade = pf2.numero_unidade
        AND fax2.numero_faixa = pf2.numero_faixa
    WHERE comp2.nome LIKE '%Dvorak%' 
       OR comp2.nome LIKE '%Dvorák%' 
       OR comp2.nome LIKE '%Dvorack%'
    GROUP BY grav2.nome
);
GO

CREATE VIEW dbo.COMPOSITOR_MAIS_FAIXAS_PLAYLISTS
AS
SELECT 
    comp.nome AS compositor,
    COUNT(*) AS qtd_faixas_em_playlists
FROM dbo.COMPOSITOR comp
JOIN dbo.FAIXA_COMPOSITOR fc ON comp.cod_compositor = fc.cod_compositor
JOIN dbo.PLAYLIST_FAIXA pf 
    ON fc.cod_album = pf.cod_album
    AND fc.numero_unidade = pf.numero_unidade
    AND fc.numero_faixa = pf.numero_faixa
GROUP BY comp.cod_compositor, comp.nome
HAVING COUNT(*) >= ALL (
    SELECT COUNT(*)
    FROM dbo.COMPOSITOR comp2
    JOIN dbo.FAIXA_COMPOSITOR fc2 ON comp2.cod_compositor = fc2.cod_compositor
    JOIN dbo.PLAYLIST_FAIXA pf2 
        ON fc2.cod_album = pf2.cod_album
        AND fc2.numero_unidade = pf2.numero_unidade
        AND fc2.numero_faixa = pf2.numero_faixa
    GROUP BY comp2.cod_compositor
);
GO

CREATE VIEW dbo.PLAYLISTS_CONCERTO_BARROCO
AS
SELECT 
    play.cod_playlist,
    play.nome AS nome_playlist,
    play.data_criacao,
    play.tempo_total_execucao
FROM dbo.PLAYLIST play
WHERE (SELECT COUNT(*) FROM dbo.PLAYLIST_FAIXA WHERE cod_playlist = play.cod_playlist) > 0
  AND (SELECT COUNT(*) 
       FROM dbo.PLAYLIST_FAIXA pf
       JOIN dbo.FAIXA fax 
           ON pf.cod_album = fax.cod_album
           AND pf.numero_unidade = fax.numero_unidade
           AND pf.numero_faixa = fax.numero_faixa
       JOIN dbo.TIPO_COMPOSICAO tc ON fax.cod_tipo_composicao = tc.cod_tipo_composicao
       WHERE pf.cod_playlist = play.cod_playlist
         AND UPPER(tc.descricao) NOT LIKE '%CONCERTO%') = 0
  AND (SELECT COUNT(*) 
       FROM dbo.PLAYLIST_FAIXA pf
       JOIN dbo.FAIXA fax 
           ON pf.cod_album = fax.cod_album
           AND pf.numero_unidade = fax.numero_unidade
           AND pf.numero_faixa = fax.numero_faixa
       WHERE pf.cod_playlist = play.cod_playlist
         AND (SELECT COUNT(*) 
              FROM dbo.FAIXA_COMPOSITOR fc
              JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
              JOIN dbo.PERIODO_MUSICAL per ON comp.cod_periodo = per.cod_periodo
              WHERE fc.cod_album = fax.cod_album
                AND fc.numero_unidade = fax.numero_unidade
                AND fc.numero_faixa = fax.numero_faixa
                AND UPPER(per.descricao) LIKE '%BARROCO%') = 0) = 0
  AND (SELECT COUNT(*) 
       FROM dbo.PLAYLIST_FAIXA pf
       JOIN dbo.FAIXA fax 
           ON pf.cod_album = fax.cod_album
           AND pf.numero_unidade = fax.numero_unidade
           AND pf.numero_faixa = fax.numero_faixa
       WHERE pf.cod_playlist = play.cod_playlist
         AND (SELECT COUNT(*) 
              FROM dbo.FAIXA_COMPOSITOR fc
              JOIN dbo.COMPOSITOR comp ON fc.cod_compositor = comp.cod_compositor
              JOIN dbo.PERIODO_MUSICAL per ON comp.cod_periodo = per.cod_periodo
              WHERE fc.cod_album = fax.cod_album
                AND fc.numero_unidade = fax.numero_unidade
                AND fc.numero_faixa = fax.numero_faixa
                AND UPPER(per.descricao) NOT LIKE '%BARROCO%') > 0) = 0;
GO