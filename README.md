# 🏘️ Monte Belo — Dashboard de Acompanhamento de Obra

Dashboard web interativo para acompanhamento do progresso de construção do empreendimento Monte Belo, Codó/MA.

## 📁 Estrutura de arquivos

```
monte-belo-dashboard/
├── index.html    ← Página principal
├── styles.css    ← Estilos
├── script.js     ← Lógica do dashboard
└── data.json     ← Dados das unidades (editável)
```

## 🚀 Como usar

### Localmente
Abra `index.html` em qualquer navegador moderno. **Nota:** para carregar o `data.json` localmente é necessário um servidor local (ex: Live Server no VS Code, ou `python -m http.server`).

### GitHub Pages (recomendado)
1. Crie um repositório no GitHub
2. Faça upload dos 4 arquivos
3. Vá em **Settings → Pages → Source: main branch / root**
4. Acesse em `https://seu-usuario.github.io/nome-do-repo`

## 🎨 Status e cores

| Status      | Cor       | Descrição                  |
|-------------|-----------|----------------------------|
| ⏳ Pendente  | Vermelho  | Obra não iniciada          |
| 🏗️ Fundação  | Cinza     | Fundação em execução       |
| 🧱 Alvenaria | Amarelo   | Paredes em execução        |
| 🪣 Reboco    | Azul      | Reboco/massa em execução   |
| 🎨 Pintura   | Verde     | Pintura em execução        |
| ✅ Finalizada | Roxo      | Unidade concluída          |

## 📝 Como atualizar o data.json

```json
[
  {"quadra":"Q-01","casa":"Q01-L01","status":"fundacao"},
  {"quadra":"Q-01","casa":"Q01-L02","status":"alvenaria"},
  ...
]
```

## ✏️ Modo de edição

- **Clique em qualquer lote** → abre modal para alterar status individual
- **Botão "Edição em Lote"** → altera vários lotes de uma vez (ex: `Q01-L01, Q01-L02, Q02-L05`)
- **Exportar JSON** → baixa o estado atual
- **Importar JSON** → carrega um arquivo JSON externo

> Os dados são salvos automaticamente no navegador (localStorage). Para compartilhar, use Exportar/Importar.

## 🏗️ Empreendimento

- **19 quadras** (Q-01 a Q-19)
- **30 lotes por quadra** (L01 a L30)
- **570 unidades no total**
- Área de cada lote: **133,00 m²** (9,50 × 14,00 m)
- Áreas comuns: Quadra de Beach Tennis, Playground, PetPlay, Área Verde, Pergolados
