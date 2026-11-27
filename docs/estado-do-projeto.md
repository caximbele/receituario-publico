# Estado do projeto

Atualizado em 27/11/2026. Numa sessão nova, leia este arquivo, o `CONTEXT.md` (glossário) e os ADRs 0009 a 0013. Ao
fim de cada tarefa, atualize as seções "O que foi feito" e "Pendências".

## Os objetivos

- **O Receituário:** uma página estática que monta e imprime a Receita de alta a partir do paciente aberto no iSaúde,
  com as regras das normas sanitárias: Tipo de receituário, Quantidade a dispensar e Vias. Nada do paciente sai da
  memória da página: sem armazenamento, sem URL e sem rede (a política da página tem `connect-src 'none'`).
- **O prescritor da UPA** (26 e 27/11/2026, publicado; falta a conferência na UAI, nas Pendências): levar o
  Receituário à tela de atendimento da UPA, a "UAI" (Setor UAI PIEDADE da UPA de Brumadinho), com o quadro Padrões, que
  traz os medicamentos de uso comum com Dose, Posologia, duração e Quantidade definidas pelo Prescritor. Os Padrões são
  só de adulto, de 12 anos para cima.
- **O atendimento da USF** (27/11/2026, publicado): a lista dos Padrões começa fechada, para o Novo item ficar à vista
  (ADR 0013).
- **A busca dos Padrões** (27/11/2026): achar o Padrão pelo nome, sem abrir nem percorrer a lista.
- **Fora do escopo:** a Prescrição de uso interno (ADR 0010) e a pediatria por peso ou idade nos Padrões (versão 2). A
  pediatria continua no Novo item, com a dose digitada pelo Prescritor, como sempre.

## Como funciona

1. No iSaúde, o Prescritor clica no Favorito numa Tela de atendimento: a SOAP, a Renovação de receita ou a UPA. O
   Favorito confere o nome logado e o Estabelecimento do topo, lê o paciente na tela e no cadastro (só GET), abre a
   página e manda os dados por `postMessage`. Nada é gravado no iSaúde.
2. A página confere a mensagem (`src/mensagem.js`) e mostra o paciente. Sem o Favorito, ela abre na demonstração.
3. O Prescritor monta os Itens pelo Renovar (cola o Texto para colar de uma Receita anterior), pelo quadro Padrões ou
   pelo Novo item (busca no catálogo). A cada mudança, a Montagem (`montarReceita`) separa as Receitas por Tipo de
   receituário, calcula a Quantidade, escreve a Frase e aponta erros e bloqueios.
4. Imprimir sai pelo impresso da página. Copiar texto dá o Texto para colar, que o Prescritor cola no iSaúde; a
   Renovação lê esse texto de volta numa próxima consulta (ADR 0008).

## Onde está cada coisa

| Caminho | O que é |
|---|---|
| `index.html`, `tela.js`, `estilo.css` | A página. A tela só lê e mostra: nenhuma regra fica em `tela.js`. |
| `src/montagem.js` | A Montagem, a única regra da Receita: formas, unidades de dose, Quantidade, Frase, Tipo de receituário. |
| `src/padroes.js` | Quando o quadro Padrões aparece (`quadroDosPadroes`). |
| `src/mensagem.js` | A mensagem do Favorito: telas aceitas (`TELAS`), sexo por extenso, nome sem o prontuário. |
| `src/renovacao.js`, `src/texto-para-colar.js` | A Renovação e o Texto para colar. |
| `src/busca.js`, `src/produto.js`, `src/texto.js`, `src/datas.js`, `src/folhas.js` | Busca de Produtos e de Padrões, nome do Produto, números e plurais, datas e idade, folhas do impresso. |
| `impresso.js` | O impresso: Vias e folhas. |
| `favorito.js` | O Favorito, que roda dentro do iSaúde. Não pode ter `import`: a página "Criar o favorito" o transforma em link pelo `toString()`. |
| `favorito.html`, `criar-favorito.js` | A página "Criar o favorito": o Prescritor preenche os seus dados e os das unidades, e arrasta o link. |
| `dados/catalogo.js` | O catálogo do CATMAT. É dado fixo e não se edita à mão: o gerador ficou no "prescritor" (ADR 0009). |
| `dados/padroes.js` | Os 71 Padrões, em 10 Grupos, conferidos por `tests/padroes.test.js`. |
| `dados/configuracao.js`, `dados/demonstracao.js` | A configuração (a validade da Receita simples de uso contínuo) e os pacientes, o Prescritor e a unidade da demonstração. |
| `docs/padroes-para-conferir.md` | Os Padrões aprovados, com a Frase de cada um, as notas da revisão e as fontes. |
| `docs/pesquisa/tela-da-upa.md` | O DOM da tela da UPA, o cadastro do paciente, a unidade logada e o que foi conferido. |
| `docs/superpowers/plans/2026-11-26-prescritor-da-upa.md` | O plano do prescritor da UPA, já executado, menos a conferência na UPA (os passos não foram marcados). |
| `tests/` | Os testes do motor, dos Padrões e da busca deles, da mensagem e do Favorito (`node:test`). |
| `CONTEXT.md`, `docs/adr/` | O glossário e as decisões (ADRs 0009 a 0013). |
| `docs/estado-do-projeto.md` | Este arquivo. |
| `.claude/launch.json` | O servidor local na porta 8123. Fica fora do git (`.git/info/exclude`). |
| `Backup/` | A auditoria do iSaúde de 12 e 13/11/2026 (como o iSaúde gera os PDFs, os achados, as amostras). Fica fora do git (`/Backup/` no `.git/info/exclude` deste computador). Para entendê-la, ler primeiro `Backup/README.md` e `Backup/CONTEXTO-PARA-CLAUDE.md`. |

## Como o código está montado

- **A Montagem** (`montarReceita`, em `src/montagem.js`) recebe o paciente, o Prescritor, a unidade, a emissão, o
  catálogo e os itens, e devolve, por item, a Frase, a conta, os erros e os alertas; as Receitas separadas por Tipo de
  receituário; e os bloqueios (CPF, justificativa, Notificação de Receita). As tabelas que mandam nela: `TIPOS_DE_RECEITA`
  (Vias, validade, CPF), `FORMAS` (Unidades de dose por forma), `POSOLOGIAS` (tipos de Posologia e como contam as
  Tomadas) e `TETOS_DA_DOSE`. Cada regra cita a norma ou a decisão que a criou.
- **A Renovação** (`src/renovacao.js`) só devolve a linha do Texto para colar se, montada de novo, ela der a mesma Frase
  sob o mesmo título de Receituário. Por isso uma mudança na Frase pode impedir a Renovação de Receitas antigas:
  `tests/padroes.test.js` confere a volta de todos os Padrões.
- **A tela** (`tela.js`) guarda só a lista de itens e chama a Montagem a cada mudança. `mostrarTopo` decide se o quadro
  Padrões aparece; `usarPadrao` preenche o Novo item com uma cópia do Padrão; o botão `#abrir-padroes` abre e fecha a
  lista. A busca `#buscar-padrao`, na linha do título, mostra por cima da tela os Padrões que `buscarPadroes`
  (`src/busca.js`) acha, no padrão da busca do Medicamento, mas com o 1º achado já em foco: o Enter o passa a
  `usarPadrao`. Nas duas buscas, só o mouse que se mexe muda a opção em foco, sem rolar a página, e o 2º clique de um
  clique duplo é engolido (`engolirCliqueDuplo`). `medirFolga` põe na folga de rolagem do foco a altura do topo e da
  barra fixos, mais 45 px; ela roda no fim de `atualizar()` e quando eles mudam de altura.
- **O impresso** (`impresso.js`) mede a altura no papel para repartir as Vias em folhas (A4 retrato, ou 2 Vias lado a
  lado em A4 paisagem).
- **Conferir na página:** a demonstração (página aberta sem o Favorito) tem 3 pacientes fictícios, todos com data de
  nascimento; o caso sem data só aparece com o Favorito.

## Como rodar, testar e publicar

- **Rodar:** o servidor "receituario" do `.claude/launch.json`, em `http://localhost:8123/`. Os módulos ES não carregam
  em `file://`. O `.claude/` fica só neste computador (`.git/info/exclude`); num clone novo, qualquer servidor HTTP
  estático na porta 8123 serve, de preferência sem cache.
- **Testar:** `node --test tests/` (Node 26). Em 27/11/2026 eram 103 testes, todos passando.
- **O Favorito:** a regra fica em `favorito.js`; os testes simulam os globais do navegador em `tests/favorito.test.js`.
  No iSaúde, ele se confere rodando o mesmo código pelo console da página, com `alert` interceptado e `window.open`
  trocado por uma função que devolve `null`: o código para nas conferências de tela, nome e unidade, sem abrir a
  janela e sem ler valores do paciente. Se `window.open` devolver um objeto, ele lê a tela e o cadastro.
- **Publicar:** só com o pedido do Prescritor. É o push da `main` para `github.com/caximbele/receituario-publico`, que
  o GitHub Pages serve em `https://caximbele.github.io/receituario-publico/`. O Git deste computador vem sem
  `credential.helper`, e o push só passa com o Git Credential Manager:
  `git -c credential.helper=manager push origin main`. O Pages leva cerca de um minuto, e o navegador guarda os
  arquivos por até 10 minutos. Para conferir o que foi publicado: `curl` no arquivo em
  `https://caximbele.github.io/receituario-publico/` com um `?v=` qualquer, e um `grep` simples.
- **Revisões:** a de acessibilidade se faz na página, pelo navegador do app (teclado, foco, contraste do texto e das
  bordas, alvo de 24 px, zoom de 200% e 400%).
  A revisão de código no nível máximo usa muitos agentes e custa caro: só quando o Prescritor pedir.
- **Depois de publicar uma mudança em `favorito.js`:** o Prescritor recria o Favorito na página "Criar o favorito",
  recarregada com Ctrl+F5, e apaga o antigo. O link leva o código dentro, e o Favorito antigo continua com o código
  antigo.

## O que foi feito

Antes de 26/11/2026, o Receituário já montava, imprimia e renovava Receitas pela SOAP e pela Renovação de receita.

Na manhã de 26/11/2026, direto na `main` e publicado (`ffaa210` a `ebabe95`): a escolha dos itens que saem em cada
impressão, com a caixa "imprimir todos"; Imprimir e Copiar texto desligados com item marcado com erro; o Tipo de
receituário escolhido no texto livre; os tipos passam a se chamar "Receituário"; e o Receituário simples em duas vias
com 2 Vias por folha.

Em 26/11/2026, no branch `prescritor-da-upa`, juntado na `main` e publicado no mesmo dia (`2d4e90f`):

- **O glossário e as decisões:** `CONTEXT.md` e os ADRs 0009 (este repositório é a fonte), 0010 (só a Receita de
  alta), 0011 (Padrões próprios) e 0012 (unidade pelo Estabelecimento do topo).
- **Os Padrões:** a lista saiu do catálogo do prescritor antigo e foi revista pela bula e pela literatura. São 71, com
  Recomendações fixas e as Quantidades fixas escolhidas pelo Prescritor. Ibuprofeno e soro fisiológico ficaram "se
  necessário", e a tobramicina ficou em 1 gota de 6 em 6 horas por 7 dias. Os que saíram e os que ainda não entram
  estão no fim de `docs/padroes-para-conferir.md`.
- **O quadro Padrões:** um clique preenche o Novo item, e o Enter confirma. O quadro some abaixo de 12 anos completos na
  data de emissão e, sem a data de nascimento, aparece com um alerta.
- **O motor:** loção, xampu e solução tópica são prescritos em aplicação; a solução, em ml; o envelope virou unidade de
  dose. O "se necessário" ganhou a condição "congestão nasal". O Padrão pode trazer Recomendações fixas.
- **O Favorito:**
  - lê a tela da UPA ("Atendimentos de Consultório", `clinical_attendances`), com a data de nascimento e o CPF tirados
    do cadastro, porque a tela não os mostra;
  - confere a unidade pelo Estabelecimento do topo, e não pelo almoxarifado (ADR 0012);
  - abre também na renovação em Consultar, porque o iSaúde só deixa editar a renovação a quem a emitiu, no mesmo dia;
  - aceita o nome do Prescritor copiado do topo ("{número} - {NOME} - {especialidade}") ou só o nome.
- **A mensagem:** aceita a tela da UPA, tira o prontuário do nome também nela, como já fazia na SOAP, e escreve o sexo
  por extenso ("Feminino"/"Masculino").

Em 27/11/2026, publicado a pedido do Prescritor:

- **Este arquivo**, com o estado do projeto.
- **A lista dos Padrões começa fechada** (ADR 0013): o título "Padrões" é um botão que a abre e fecha, para o Novo
  item subir na tela do atendimento da USF. A página não lembra a escolha. O alerta sem data de nascimento fica entre o
  título e a lista. Conferido na demonstração: fechada ao abrir, os 10 Grupos ao abrir, o clique num Padrão preenche o
  Novo item e põe o foco na Dose (ou na Posologia, quando a Dose é por Etapa), e o quadro some para a criança.
- **Os dados do Prescritor** saíram de `docs/padroes-para-conferir.md` e de `tests/favorito.test.js`. O histórico do
  GitHub continua com eles.
- **As revisões:** a de acessibilidade e uma revisão de código no nível máximo, com 15 achados. A posição do alerta e o
  título dentro do `<summary>` (o JAWS não o achava) levaram ao botão no título; os outros eram deste arquivo e do ADR
  0013. Ficou de fora só o que "nova" quer dizer em "Renovação de receita (nova e em Editar)", abaixo.

Em 27/11/2026, depois, a pedido do Prescritor:

- **A busca dos Padrões:** o campo "Buscar Padrão", na linha do título do quadro, acha o Padrão pelo nome como a busca
  do Medicamento acha o Produto: cada palavra digitada é o começo de uma palavra do nome, sem acento ("dipi feb",
  "cistite"). Os achados aparecem por cima da tela, sem abrir a lista por Grupo, e o 1º já vem em foco: o Enter o
  escolhe, as setas, o mouse e o clique escolhem outro. O Padrão preenche o Novo item como o clique na lista, e o campo
  fica em branco. Esc fecha os achados e, com eles já fechados, limpa o campo. O título continua abrindo e fechando a
  lista pela linha toda, menos a busca, e o Favorito não precisa ser recriado. Conferido na demonstração, em 1366×768:
  as setas, o Enter, o clique, o Esc, o clique fora; o Padrão por Etapa põe o foco na Posologia; o quadro some para a
  criança; a lista por Grupo abre e fecha como antes; nenhum erro no console.
- **A revisão de acessibilidade da busca**, pelo navegador do app, sem Lighthouse nem axe. A busca passou em:
  - nome, papel e estado da combobox, da lista e das opções;
  - teclado e foco visível;
  - contraste do texto e alvo de 24 px;
  - zoom de 200% e 400% sem rolagem lateral, e espaçamento de texto ampliado.

  Ela achou dois problemas antigos, da página toda, e os dois foram corrigidos:
  - a borda dos campos tinha 2,56:1 contra o branco, abaixo dos 3:1 (WCAG 1.4.11), e passou a 4,76:1 (`#64748b`, o
    cinza da borda dos botões);
  - a folga fixa de rolagem deixava o topo cobrir o campo em foco quando ele crescia com o zoom (WCAG 2.4.11). Agora
    a `tela.js` mede a altura do topo e da barra, como no item seguinte.
- **A revisão de código no nível máximo** da busca e dessas correções (5 olhares, 13 verificações e 1 varredura), com
  15 achados, todos corrigidos e conferidos no Chrome:
  - o mouse parado onde a lista abre tirava o foco do 1º achado, e passar o mouse nas opções de baixo rolava a página:
    nas duas buscas, só o mouse que se mexe muda a opção em foco, sem rolar;
  - o 2º clique de um clique duplo num achado caía no que a lista cobria (a caixa "Fora do catálogo", um botão de
    Padrão): agora ele é engolido, nas duas buscas;
  - o Tab com uma lista longa aberta deixava o foco no body (no Chrome 130+, a lista com rolagem vira parada do Tab):
    as duas listas têm `tabindex="-1"`;
  - o Enter segurado acrescentava o Padrão sem a revisão do ADR 0011: o formulário ignora a tecla repetida;
  - uma consulta só com sinal ("+", o acento antes da vogal) achava os 71 Padrões e destacava a Dipirona: agora não
    acha nada;
  - os achados cobriam o alerta sem data de nascimento: o alerta tem uma linha só dele, entre o título e a busca, e o
    campo o cita no `aria-describedby`;
  - a folga do foco medida pelo `ResizeObserver` chegava um quadro atrasada: aberta pelo Favorito com zoom de 125%, o
    Medicamento ficava inteiro embaixo da barra. `medirFolga` roda também no fim de `atualizar()`, soma 45 px para a
    mensagem do campo e é zero quando o topo e a barra não são fixos;
  - com zoom de 175% ou mais (janela abaixo de 400 px de altura), o topo e a barra rolam com a página: com 400%, eles
    cobriam a tela inteira;
  - a busca acha "500mg" como "500 mg", nas duas buscas; "d3" e "b12" continuam uma palavra só;
  - o botão do título voltou a ocupar a linha toda, menos a busca;
  - o texto deste arquivo e o comentário de `src/busca.js`.

Conferido no iSaúde:

- Em 27/11/2026, o Prescritor confirmou que o Favorito publicado funciona na SOAP e na Renovação de receita (nova e em
  Editar).
- Na USF, o Estabelecimento do topo bate com o nome de unidade que já se usava no Favorito.
- A Receita pediátrica pelo Novo item foi conferida no motor, para uma criança de 4 anos (amoxicilina suspensão e
  paracetamol gotas): saiu sem erros e sem o quadro Padrões.

## Pendências

- **A UAI:** acrescentar a unidade no Favorito, com o Nome no iSaúde
  "UPA UNIDADE DE PRONTO ATENDIMENTO DE BRUMADINHO - UAI PIEDADE" e os dados da UAI para o cabeçalho. A conferência é o
  primeiro atendimento real lá, porque o paciente teste não tem atendimento na UPA e criar um seria gravar no iSaúde.
  Nele, o Prescritor confere os dados do paciente, o quadro Padrões, a colagem no Receituário Manual e o impresso, e
  conta o resultado. Registrar em `docs/pesquisa/tela-da-upa.md` só o que funcionou ou não, nunca valores do paciente.
- **A unidade com Setor:** o Favorito já aceita a linha inteira do topo, "{Estabelecimento} - {Setor}", e, com dois
  nomes que servem, fica com o mais longo. Isso separa a UAI da UPA central. Mas não há teste desse caso, a ajuda de
  "Criar o favorito" ainda diz "antes do ' - '", e o ADR 0012 fala só do Estabelecimento.
- **A renovação nova antes de salvar:** o Favorito não aceita a página `/saude/prescription_renewals/new`.
- **"Nova" em "Renovação de receita (nova e em Editar)":** perguntar ao Prescritor o que conferiu, porque o
  Favorito não aceita `/new`.
- **Leitor de tela:** a página nunca foi testada com NVDA ou JAWS.
- **Revisão automática:** nunca rodou. O Lighthouse roda pelo F12 do Chrome (aba Lighthouse), sem baixar nada; o axe
  exige download, com o OK do Prescritor.
- **A busca dos Padrões de verdade:** conferir na USF e na UAI, pelo Favorito, num atendimento.
- **A renovação em Consultar** (`/saude/prescription_renewals/{n}`): o Favorito a aceita, mas ainda não foi conferida
  no iSaúde.
- **A lista dos Padrões fechada na USF de verdade:** conferir num atendimento, e conferir o alerta sem data de
  nascimento, que a demonstração não mostra (todos os pacientes fictícios têm a data).
- **Ainda não entram:** a beclometasona (precisa do gerador do catálogo), a benzidamina, o naratriptano e o
  levofloxacino 750 mg.
- **A tabela dos Padrões:** `docs/padroes-para-conferir.md` foi gerado por um script de rascunho, que não está no
  repositório. Ao mudar um Padrão, atualize a tabela à mão junto com `dados/padroes.js`.
- **Os branches `prescritor-da-upa` e `estado-do-projeto`:** estão todos na `main` e podem ser apagados.

## Regras que valem sempre

- **O iSaúde é produção.** Só observar: telas, GETs e JS no console. Usar só o paciente teste "TESTE DA SILVA TESTE"
  (id 261622). Nunca salvar nem encerrar um atendimento. O login no iSaúde é sempre feito pelo Prescritor.
- **Com um paciente real na tela,** ler só a estrutura (ids, rótulos, máscaras), nunca os valores, e não abrir o
  cadastro nem o histórico dele. Ao ler uma lista, como a das renovações, filtrar no próprio JS e devolver só o paciente
  teste ou contagens.
- **O GitHub Pages é público:** `docs/` e `CONTEXT.md` ficam públicos no push. Nenhum dado de paciente real, nem do
  Prescritor, entra no repositório. A pasta `Backup/` (a auditoria do iSaúde de 12 e 13/11/2026) nunca entra no git.
- **O estilo:** texto de tela, de documento e de commit em português, com os termos do `CONTEXT.md`. Commit de uma
  frase, sem prefixo. O próximo ADR é o 0014.

## O que ficou no "prescritor"

O repositório "prescritor" não está disponível (ADR 0009). Lá ficaram os ADRs 0001 a 0008, a spec e o glossário
completo das Fases 1 a 3 (termos como Montagem, Frase e Texto para colar não estão no `CONTEXT.md`), o
`docs/pesquisa/leitura-do-isaude.md` (citado em `favorito.js`) e o gerador do catálogo, `construir-catalogo.js`. Os
comentários do código citam os tickets e as decisões de lá; as regras estão escritas no próprio código.
