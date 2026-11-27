# Estado do projeto

Atualizado em 27/11/2026. Numa sessão nova, leia este arquivo, o `CONTEXT.md` (glossário) e os ADRs 0009 a 0013. Ao
fim de cada tarefa, atualize as seções "O que foi feito" e "Pendências".

## Os objetivos

- **O Receituário:** uma página estática que monta e imprime a Receita de alta a partir do paciente aberto no iSaúde,
  com as regras das normas sanitárias: Tipo de receituário, Quantidade a dispensar e Vias. Nada do paciente sai da
  memória da página: sem armazenamento, sem URL e sem rede (a política da página tem `connect-src 'none'`).
- **O prescritor da UPA** (26 e 27/11/2026, publicado; falta a conferência na UAI, nas Pendências): levar o Receituário à tela de atendimento da UPA, a
  "UAI" (Setor UAI PIEDADE da UPA de Brumadinho), com o quadro Padrões, que traz os medicamentos de uso comum com Dose,
  Posologia, duração e Quantidade definidas pelo Prescritor. Os Padrões são só de adulto, de 12 anos para cima.
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
| `src/busca.js`, `src/produto.js`, `src/texto.js`, `src/datas.js`, `src/folhas.js` | Busca, nome do Produto, números e plurais, datas e idade, folhas do impresso. |
| `impresso.js` | O impresso: Vias e folhas. |
| `favorito.js` | O Favorito, que roda dentro do iSaúde. Não pode ter `import`: a página "Criar o favorito" o transforma em link pelo `toString()`. |
| `favorito.html`, `criar-favorito.js` | A página "Criar o favorito": o Prescritor preenche os seus dados e os das unidades, e arrasta o link. |
| `dados/catalogo.js` | O catálogo do CATMAT. É dado fixo e não se edita à mão: o gerador ficou no "prescritor" (ADR 0009). |
| `dados/padroes.js` | Os 71 Padrões, em 10 Grupos, conferidos por `tests/padroes.test.js`. |
| `dados/configuracao.js`, `dados/demonstracao.js` | A configuração (a validade da Receita simples de uso contínuo) e os pacientes, o Prescritor e a unidade da demonstração. |
| `docs/padroes-para-conferir.md` | Os Padrões aprovados, com a Frase de cada um, as notas da revisão e as fontes. |
| `docs/pesquisa/tela-da-upa.md` | O DOM da tela da UPA, o cadastro do paciente, a unidade logada e o que foi conferido. |
| `docs/superpowers/plans/2026-11-26-prescritor-da-upa.md` | O plano do prescritor da UPA, já executado, menos a conferência na UPA (os passos não foram marcados). |
| `tests/` | Os testes do motor, dos Padrões, da mensagem e do Favorito (`node:test`). |

## Como rodar, testar e publicar

- **Rodar:** o servidor "receituario" do `.claude/launch.json`, em `http://localhost:8123/`. Os módulos ES não carregam
  em `file://`. O `.claude/` fica só neste computador (`.git/info/exclude`); num clone novo, qualquer servidor HTTP
  estático na porta 8123 serve, de preferência sem cache.
- **Testar:** `node --test tests/` (Node 26). Em 27/11/2026 eram 99 testes, todos passando.
- **O Favorito:** a regra fica em `favorito.js`; os testes simulam os globais do navegador em `tests/favorito.test.js`.
  No iSaúde, ele se confere rodando o mesmo código pelo console da página, com `alert` interceptado e `window.open`
  trocado por uma função que devolve `null`: o código para nas conferências de tela, nome e unidade, sem abrir a
  janela e sem ler valores do paciente. Se `window.open` devolver um objeto, ele lê a tela e o cadastro.
- **Publicar:** só com o pedido do Prescritor. É o push da `main` para `github.com/caximbele/receituario-publico`, que
  o GitHub Pages serve em `https://caximbele.github.io/receituario-publico/`. O Git deste computador vem sem
  `credential.helper`, e o push só passa com o Git Credential Manager:
  `git -c credential.helper=manager push origin main`. O Pages leva cerca de um minuto, e o navegador guarda os
  arquivos por até 10 minutos.
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

Conferido antes de 27/11/2026:

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

O repositório "prescritor" não está disponível (ADR 0009). Lá ficaram os ADRs 0001 a 0008, a spec e o glossário completo das Fases 1 a 3 (termos como Montagem, Frase e Texto
para colar não estão no `CONTEXT.md`), o
`docs/pesquisa/leitura-do-isaude.md` (citado em `favorito.js`) e o gerador do catálogo, `construir-catalogo.js`.
