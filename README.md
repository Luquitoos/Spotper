# SpotPer - Gerenciador de Coleção de Música Clássica

**SpotPer** é uma aplicação personalizada estilo Spotify, focada em colecionadores de música clássica. Este projeto foi desenvolvido para atender aos desafios específicos de catalogação de obras clássicas, incluindo gestão de compositores, intérpretes, períodos musicais e estruturas complexas de álbuns (CDs, Vinis, Downloads).

A aplicação fornece uma interface moderna para gerenciar playlists, consultar álbuns e explorar a rica base de dados de música clássica, respeitando regras de negócios rigorosas (como exclusividade de gravações DDD para o período Barroco).

---

## 📋 Requisitos do Sistema

Antes de iniciar, certifique-se de ter os seguintes softwares instalados:

1. **Python 3.8+**: [Download Python](https://www.python.org/downloads/)
   - *Importante*: Na instalação, marque a opção "Add Python to PATH".
2. **SQL Server** (Express ou Developer Edition).
3. **ODBC Driver 18 for SQL Server**: Necessário para o Python conectar ao banco. [Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
4. **VS Code** (Recomendado) com a extensão **Live Server**.

### 🔧 Solução de Problemas: `pip` não reconhecido
Se ao digitar `pip` no terminal aparecer um erro, adicione o Python às variáveis de ambiente:
1. Abra o menu Iniciar e procure por "Variáveis de Ambiente" → "Editar as variáveis de ambiente do sistema".
2. Clique em **Variáveis de Ambiente**.
3. Na seção **Variáveis do sistema** ou **Variáveis de usuário**, localize `Path` e clique em **Editar**.
4. Clique em **Novo** e adicione o caminho da pasta `Scripts` do Python (ex.: `C:\\Users\\SEU_USUARIO\\AppData\\Local\\Programs\\Python\\Python3X\\Scripts`).
5. Reinicie o terminal.

---

## 🗄️ 1. Configuração do Banco de Dados

O banco de dados é o coração do SpotPer. Siga estes passos com atenção:

### 1.1 Preparar o Script SQL
- Abra o arquivo [`banco.sql`](file:///g:/Spotper/banco.sql).
- **Atenção aos caminhos dos arquivos**: O script está configurado para salvar os arquivos do banco em `C:\\SQLData` e `C:\\SQLLogs`.
  - **Opção A (Recomendada)**: Crie manualmente as pastas `C:\\SQLData` e `C:\\SQLLogs`.
  - **Opção B**: Edite o script e altere todas as linhas `FILENAME = '...'` para caminhos que existam no seu PC.

### 1.2 Criar o Banco
1. Abra o **SQL Server Management Studio (SSMS)** ou use a extensão do VS Code.
2. Execute todo o conteúdo do arquivo `banco.sql`.
   - Isso criará o banco `BDSpotPer`, tabelas, views, triggers e procedimentos armazenados.

---

## 🐍 2. Configuração do Backend

O backend é desenvolvido em **Python** usando **Flask**.

1. **Instalar dependências**
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```
2. **Configurar a conexão**
   - Abra [`backend/config/database.py`](file:///g:/Spotper/backend/config/database.py).
   - Ajuste a variável `SERVER` para o nome/instância do seu SQL Server (ex.: `DESKTOP-XYZ\\SQLEXPRESS`).
   - O script usa autenticação do Windows (`Trusted_Connection=yes`). Certifique‑se de que seu usuário tem permissão no SQL Server.
3. **Executar a API**
   ```powershell
   python app.py
   ```
   - A API ficará disponível em `http://127.0.0.1:5000`.

---

## 🖥️ 3. Configuração do Frontend

O frontend consiste em arquivos estáticos HTML/CSS/JS. Não requer compilação, apenas um servidor HTTP simples para evitar restrições de CORS.

### Opção A – Live Server (VS Code) – *Fácil*
1. Abra a pasta `frontend` no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.
3. O navegador abrirá em `http://127.0.0.1:5500` (ou porta similar).

### Opção B – Servidor Python
```powershell
cd frontend
python -m http.server 8000
```
Acesse `http://localhost:8000`.

---

## 🚀 Como Utilizar o SpotPer

### Fluxo Esperado
1. **Home** – Visão geral com acesso rápido às funcionalidades.
2. **Playlists**
   - **Criar**: Clique em "Nova Playlist", forneça um nome.
   - **Gerenciar**: Selecione uma playlist para visualizar faixas, tempo total e editar conteúdo.
   - **Adicionar Faixas**: Ao editar, expanda álbuns disponíveis, escolha faixas e clique em "+".
3. **Relatórios** – Acesse consultas específicas exigidas pelo projeto (ex.: Álbuns acima da média, Gravadoras com mais playlists de Dvorak, etc.).

### Funcionalidades Principais
- **Gestão de Álbuns** (CD, Vinil, Download) com validações de mídia e data de gravação.
- **Regras de Negócio**
  - *Barroco*: Apenas gravações `DDD` são permitidas para compositores do período Barroco.
  - *Limite de Faixas*: Máximo de 64 faixas por álbum.
  - *Preço Justo*: Preço de compra não pode exceder 3× a média dos álbuns com todas as faixas `DDD`.
- **Playlists Dinâmicas** – Criação, edição, remoção de faixas, cálculo automático de tempo total.
- **Filtros Avançados** – Busca por compositor, tipo de composição, período musical, etc.
- **Relatórios Materializados** – Views para consultas de alto desempenho.

---

## 📂 Estrutura de Arquivos

```
SpotPer/
├─ banco.sql                # Script de criação do DB (tabelas, triggers, procedures)
├─ backend/
│   ├─ app.py               # Entrada da API Flask
│   ├─ config/
│   │   └─ database.py       # Configurações de conexão ODBC
│   └─ routes/
│       ├─ albums.py         # Endpoints de álbuns
│       ├─ composers.py      # Endpoints de compositores
│       └─ ...
├─ frontend/
│   ├─ index.html           # SPA principal
│   ├─ css/
│   └─ components/
│       └─ ...
└─ README.md                # Este documento
```

---

## 🗃️ Detalhes do Banco de Dados

### Principais Tabelas
| Tabela | Descrição |
|--------|-----------|
| `GRAVADORA` | Dados da gravadora (código, nome, endereço, homepage). |
| `TELEFONE_GRAVADORA` | Telefones associados a gravadoras. |
| `PERIODO_MUSICAL` | Períodos históricos (Barroco, Clássico, etc.). |
| `COMPOSITOR` | Compositores com informações pessoais e período. |
| `TIPO_COMPOSICAO` | Tipo de composição (Sinfonia, Ópera, Concerto, etc.). |
| `INTERPRETE` | Interpretes (orquestra, trio, etc.). |
| `ALBUM` | Álbuns físicos ou digitais, com preço, datas e mídia. |
| `FAIXA` | Faixas de um álbum, com número, descrição, tipo de gravação. |
| `FAIXA_COMPOSITOR` | Associação many‑to‑many entre faixas e compositores. |
| `FAIXA_INTERPRETE` | Associação many‑to‑many entre faixas e intérpretes. |
| `PLAYLIST` | Playlists criadas pelos usuários. |
| `PLAYLIST_FAIXA` | Relacionamento entre playlists e faixas (ordem, contagem de reproduções). |

### Restrições e Triggers Relevantes
- **Barroco exige DDD** – Triggers `BARROCO_EXIGE_DDD_FAIXA` e `BARROCO_EXIGE_DDD_COMPOSITOR` impedem inserções de faixas de compositores barrocos sem gravação `DDD`.
- **Limite de 64 faixas por álbum** – Trigger `LIMITE_64_FAIXAS_ALBUM`.
- **Preço máximo** – Trigger `VALIDAR_PRECO_ALBUM` garante que o preço não ultrapasse 3× a média dos álbuns DDD.
- **Validação de mídia** – Trigger `VALIDAR_TIPO_GRAVACAO_FAIXA` controla tipos de gravação conforme mídia (CD, VINIL, DOWNLOAD).
- **Atualização automática do tempo total da playlist** – Trigger `ATUALIZAR_TEMPO_PLAYLIST` recalcula `tempo_total_execucao` ao inserir ou remover faixas.

### Índices
- **PKs** e **FKs** padrão.
- **Índice primário** na tabela `FAIXA` sobre `cod_album` (clustered, fillfactor 100).
- **Índice secundário** na tabela `FAIXA` sobre `cod_tipo_composicao` (non‑clustered, fillfactor 100).
- Índices auxiliares em `COMPOSITOR`, `INTERPRETE`, `ALBUM`, `GRAVADORA` para buscas rápidas.

### Views Materializadas
- `VW_MATERIALIZADA_PLAYLIST_ALBUNS` – Quantidade de álbuns por playlist.
- `VW_MATERIALIZADA_PLAYLIST_QTDALBUNS` – Quantidade de faixas por playlist/álbum.
- `PLAYLIST_QUANTIDADE_ALBUNS` – Resumo de playlists e número de álbuns.
- `ALBUNS_ACIMA_MEDIA` – Álbuns cujo preço está acima da média geral.
- `GRAVADORA_MAIS_PLAYLISTS_DVORAK` – Gravadora com mais playlists contendo obras de Dvorak.
- `COMPOSITOR_MAIS_FAIXAS_PLAYLISTS` – Compositor com maior número de faixas em playlists.
- `PLAYLISTS_CONCERTO_BARROCO` – Playlists contendo apenas concertos do período Barroco.

### Funções e Procedures
- **Função** `dbo.BUSCAR_ALBUNS_POR_COMPOSITOR` – Retorna álbuns de um compositor.
- **Procedures**
  - `REGISTRAR_REPRODUCAO` – Atualiza contagem de reproduções de faixa em playlist.
  - `INSERIR_ALBUM`, `INSERIR_FAIXA`, `ASSOCIAR_COMPOSITOR_FAIXA`, `ASSOCIAR_INTERPRETE_FAIXA` – CRUD especializado.
  - `CRIAR_PLAYLIST`, `ADICIONAR_FAIXA_PLAYLIST`, `REMOVER_FAIXA_PLAYLIST` – Gerenciamento de playlists.
  - `LISTAR_ALBUNS`, `LISTAR_FAIXAS_ALBUM`, `LISTAR_COMPOSITORES_FAIXA`, `LISTAR_PLAYLISTS`, `LISTAR_FAIXAS_PLAYLIST` – Consultas auxiliares.