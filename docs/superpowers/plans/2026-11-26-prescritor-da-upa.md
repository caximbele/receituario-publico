# Prescritor da UPA — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O quadro Padrões preenche o Novo item com um clique, só a partir de 12 anos, e o Favorito passa a funcionar na
tela de atendimento da UPA.

**Architecture:** A página é estática, em módulos ES, sem rede. A regra pura fica em `src/` e é testada com `node --test
tests/`; a tela (`tela.js`, `index.html`) só lê e mostra. O Favorito (`favorito.js`) roda dentro do iSaúde e não pode
importar nada: só se verifica no próprio iSaúde.

**Tech Stack:** JavaScript puro (módulos ES), `node:test` e `node:assert/strict` (Node 26), servidor HTTP do
`.claude/launch.json` na porta 8123.

**Spec:** não há spec à parte. O plano sai destes documentos:
- `CONTEXT.md` (glossário);
- `docs/adr/0009` a `0012`;
- `docs/pesquisa/tela-da-upa.md` (o DOM da UPA);
- `docs/padroes-para-conferir.md` (os Padrões aprovados em 26/11/2026).

## Global Constraints

- A Montagem (`src/montagem.js`) continua sendo a única regra da Receita: o quadro Padrões só preenche o formulário, e o
  item entra pelo mesmo `salvar()` de sempre (ADR 0011).
- O Padrão nunca tem Início nem Uso contínuo, e nunca exige Notificação de Receita: `tests/padroes.test.js` já confere
  isso e tem de continuar passando.
- O corte é de **12 anos completos na data de emissão** (`hoje()`). Abaixo disso o quadro some; sem data de nascimento,
  o quadro aparece com o alerta.
- `dados/catalogo.js` não se edita à mão (ADR 0009).
- No iSaúde, só observar: nunca gravar nem encerrar um atendimento, e usar só o paciente teste "TESTE DA SILVA TESTE"
  (id 261622). Com paciente real na tela, ler só a estrutura (ids, rótulos, máscaras), nunca valores.
- O login no iSaúde é feito pelo usuário.
- A unidade logada é conferida pelo Estabelecimento do topo, `#modal_edit_user_setting`, antes do " - Setor" (ADR
  0012). Todo Favorito tem de ser recriado na página Criar o favorito.
- Texto de tela e de commit em português, no estilo dos commits do repositório: uma frase, sem prefixo.
- O repositório é publicado no GitHub Pages, que é público: não fazer push sem o usuário pedir.

## Review Focus

1. **Paciente que faz 12 anos no dia da emissão:** o quadro aparece, porque o ano conta no dia do aniversário, como em
   `idade()`. É o teste `12 anos no dia do aniversário` (Task 1).
2. **Data de nascimento inválida ou depois da emissão:** é tratada como sem data. O quadro aparece com o alerta, e não
   some. São os testes `nascimento inválido ou futuro` (Task 1).
3. **Clique num Padrão com um item em edição:** a edição é deixada sem gravar, o item na lista fica como estava e o
   Padrão entra como item novo, como no Esc. É o passo de verificação 4 da Task 2.
4. **Um nome de unidade que é começo de outro**, como "UBS CENTRO" e "UBS CENTRO II": o Favorito só aceita o nome
   inteiro antes do " - ". É o passo de verificação 3 da Task 4.
5. **Favorito antigo da SOAP que manda o sexo como `female`/`male`:** a página mostra "Feminino"/"Masculino". É o teste
   `sexo em código vira o texto` (Task 3).

---

### Task 1: Em que caso o quadro Padrões aparece

**Files:**
- Modify: `src/datas.js:54-63` (`idade`)
- Create: `src/padroes.js`
- Test: `tests/quadro-dos-padroes.test.js`

**Interfaces:**
- Produces:
  - `mesesCompletos(nascimento: string, emissao: string): number | null`, em `src/datas.js`. Devolve os meses completos
    entre as datas `aaaa-mm-dd`, ou `null` quando o nascimento falta, não existe ou é posterior à emissão. `idade()`
    passa a usá-lo, sem mudar o que devolve.
  - `quadroDosPadroes(nascimento: string, emissao: string): { mostrar: boolean, alerta: string | null }`, em
    `src/padroes.js`.
  - `ALERTA_SEM_NASCIMENTO`, exportado de `src/padroes.js`, com o texto exato `'Sem a data de nascimento: confira se o
    paciente tem 12 anos ou mais antes de usar um Padrão.'`

- [ ] **Step 1: Escrever os testes que falham**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quadroDosPadroes, ALERTA_SEM_NASCIMENTO } from '../src/padroes.js';
import { idade } from '../src/datas.js';

test('adulto vê o quadro, sem alerta', () => {
  assert.deepEqual(quadroDosPadroes('1960-05-10', '2026-11-26'), { mostrar: true, alerta: null });
});
test('12 anos no dia do aniversário', () => {
  assert.deepEqual(quadroDosPadroes('2014-11-26', '2026-11-26'), { mostrar: true, alerta: null });
});
test('11 anos na véspera do aniversário', () => {
  assert.deepEqual(quadroDosPadroes('2014-11-27', '2026-11-26'), { mostrar: false, alerta: null });
});
test('sem nascimento: aparece com alerta', () => {
  assert.deepEqual(quadroDosPadroes('', '2026-11-26'), { mostrar: true, alerta: ALERTA_SEM_NASCIMENTO });
});
test('nascimento inválido ou futuro: aparece com alerta', () => {
  for (const n of ['2026-02-30', '2027-01-01', 'abc']) {
    assert.deepEqual(quadroDosPadroes(n, '2026-11-26'), { mostrar: true, alerta: ALERTA_SEM_NASCIMENTO });
  }
});
test('idade() não mudou', () => {
  assert.equal(idade('1960-05-10', '2026-11-26'), '66 anos');
  assert.equal(idade('2026-03-01', '2026-11-26'), '8 meses');
  assert.equal(idade('', '2026-11-26'), '');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/quadro-dos-padroes.test.js`
Expected: FAIL, porque `../src/padroes.js` não existe.

- [ ] **Step 3: Implementar**
  - Tirar de `idade()` a conta de meses para `mesesCompletos`.
  - `quadroDosPadroes`:
    - meses `null` → `{ mostrar: true, alerta: ALERTA_SEM_NASCIMENTO }`;
    - meses `>= 144` → `{ mostrar: true, alerta: null }`;
    - senão `{ mostrar: false, alerta: null }`.

- [ ] **Step 4: Rodar todos os testes**

Run: `node --test tests/`
Expected: PASS em tudo, inclusive os 66 testes de `tests/padroes.test.js` (65 Padrões e os nomes únicos).

- [ ] **Step 5: Commit**

```bash
git add src/datas.js src/padroes.js tests/quadro-dos-padroes.test.js
git commit -m "Quadro Padrões só a partir de 12 anos, com alerta sem data de nascimento"
```

---

### Task 2: O quadro Padrões na tela

**Files:**
- Modify: `index.html`. Nova `<section class="quadro" aria-labelledby="titulo-padroes" id="quadro-padroes">` entre a
  seção Renovar e o `<form id="item">` (por volta da linha 44).
- Modify: `tela.js`. Imports, `mostrarTopo()` (por volta da linha 138), novo `mostrarPadroes()` e um ouvinte de clique.

**Interfaces:**
- Consumes:
  - `quadroDosPadroes`, de `src/padroes.js` (Task 1);
  - `dados/padroes.js`, `export default [{ grupo, nome, item }]`;
  - em `tela.js`: `preencher(item)`, `atualizar()`, `limpar()`, `atendimento()`, `hoje()`, e as variáveis `editando`,
    `tentou`, `tocados`.

Comportamento:
- O quadro tem o título "Padrões" e um `<fieldset>` por Grupo, com `<legend>` = Grupo, na ordem do arquivo.
- Cada Padrão é um `<button type="button" class="botao" data-padrao="{índice}">{nome}</button>`.
- Fora do quadro, `<p class="alerta" id="alerta-padroes" role="status">` mostra o `alerta`.
- `mostrarPadroes()` roda dentro de `mostrarTopo()`. Ele monta os botões só uma vez e põe
  `hidden = !mostrar` no quadro e no alerta.
- Clique num botão:
  1. Faz o mesmo que `limpar()` sem o foco: `editando = null`, `tentou = false`, `tocados.clear()`.
  2. Chama `preencher(structuredClone(padroes[i].item))` e depois `atualizar()`.
  3. Põe o foco em `$('dose')`, para Enter acrescentar o item.

  O `structuredClone` existe para que a edição no formulário nunca altere `dados/padroes.js`.

- [ ] **Step 1: Implementar o quadro, os botões e o clique, como descrito acima**

- [ ] **Step 2: Abrir a página**

Run: `preview_start` com `{ name: "receituario" }` e abrir `http://localhost:8123/`.
Expected:
- com o paciente fictício "adulta-com-cpf", o quadro aparece, com os 10 Grupos de `dados/padroes.js`;
- `read_console_messages` não mostra erro.

- [ ] **Step 3: Verificar o corte**

Trocar o paciente fictício para "crianca" (nascida em 2026-03-01).
Expected: o quadro some. O seletor `#paciente-ficticio` já chama `mostrarTopo()` no `change` (`tela.js:645`).

- [ ] **Step 4: Verificar o clique e o Enter**

1. Com "adulta-com-cpf", clicar em "Amoxicilina 500 mg — 7 dias (sinusite, dente)" e apertar Enter.
   Expected: a lista Itens ganha "Amoxicilina 500 mg — cápsula. Tomar 01 cápsula por via oral, a cada 8 horas, por 7
   dias. Quantidade: 21 cápsulas. Completar todo o tratamento…", no Receituário de antimicrobiano.
2. Editar esse item, clicar em "Dipirona 500 mg — dor" e apertar Enter.
   Expected: a amoxicilina continua na lista sem mudança, e a dipirona entra como segundo item.

- [ ] **Step 5: Screenshot para o usuário**, e commit

```bash
git add index.html tela.js
git commit -m "Quadro Padrões preenche o Novo item com um clique"
```

---

### Task 3: A mensagem aceita a tela da UPA

**Files:**
- Modify: `src/mensagem.js:20` (`TELAS`) e `pacienteDoLido` (linhas 31-49)
- Test: `tests/mensagem.test.js`

**Interfaces:**
- Produces:
  - `TELAS = ['soap', 'renovacao', 'upa']`.
  - No `pacienteDoLido`, o nome tira o "{prontuário} - " também quando `lido.tela === 'upa'`.
  - O sexo `'female'` vira `'Feminino'` e `'male'` vira `'Masculino'`, em qualquer tela. Qualquer outro texto fica como
    lido.

- [ ] **Step 1: Escrever os testes que falham**

Crie, no teste, o helper `mensagem({ tela, nome, sexo })`. Ele devolve uma mensagem `versao: 1` válida, com todas as
chaves de `CHAVES` preenchidas com `''`, exceto as dadas. Os testes:

```js
test('mensagem da UPA é aceita e o prontuário sai do nome', () => {
  const r = lerMensagem(mensagem({ tela: 'upa', nome: '261622 - TESTE DA SILVA TESTE' }));
  assert.equal(r.erro, undefined);
  assert.equal(r.paciente.nome, 'TESTE DA SILVA TESTE');
});
test('sexo em código vira o texto', () => {
  assert.equal(lerMensagem(mensagem({ tela: 'soap', sexo: 'female' })).paciente.sexo, 'Feminino');
  assert.equal(lerMensagem(mensagem({ tela: 'upa', sexo: 'male' })).paciente.sexo, 'Masculino');
  assert.equal(lerMensagem(mensagem({ tela: 'renovacao', sexo: 'Feminino' })).paciente.sexo, 'Feminino');
});
test('tela desconhecida é recusada', () => {
  assert.match(lerMensagem(mensagem({ tela: 'outra' })).erro, /formato que a página não conhece/);
});
test('na Renovação o nome fica inteiro', () => {
  assert.equal(lerMensagem(mensagem({ tela: 'renovacao', nome: 'A - B' })).paciente.nome, 'A - B');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/mensagem.test.js`
Expected: FAIL em "mensagem da UPA" e em "sexo em código".

- [ ] **Step 3: Implementar as três mudanças de Interfaces**

- [ ] **Step 4: Rodar todos os testes**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/mensagem.js tests/mensagem.test.js
git commit -m "Mensagem aceita a tela da UPA e escreve o sexo por extenso"
```

---

### Task 4: O Favorito na tela da UPA e a unidade pelo Estabelecimento

**Files:**
- Modify: `favorito.js`. O caminho aceito (linhas 13-15), a conferência da unidade (linhas 21-23), a leitura do paciente
  (linhas 63-85) e o laço do cadastro (linhas 99-104).

**Interfaces:**
- Consumes: a tela `'upa'`, de `src/mensagem.js` (Task 3). A `mensagem` continua `versao: 1`.
- Produces: `lido.tela` é `'soap'`, `'renovacao'` ou `'upa'`.

O que muda dentro de `favorito(config)`, que não pode usar nada de fora dele:

1. **Caminho da UPA.** Acrescentar `const upa = /^\/saude\/receptions\/\d+\/clinical_attendances\/\d+\/edit$/.test(location.pathname);`.
   Ele entra no `if` do caminho, e a mensagem de recusa passa a ser "Abra o favorito na tela de um atendimento ou de uma
   renovação de receita." (o texto atual já cobre a UPA).
2. **Unidade pelo Estabelecimento.** `topo = normalizar(document.getElementById('modal_edit_user_setting')?.textContent)`.
   A unidade escolhida é a primeira em que `n = normalizar(u.nomeNoIsaude)` não é vazio e `topo === n ||
   topo.startsWith(n + ' - ')`. Isso sai no lugar de `appContext.warehouse.name`, nas três telas.
3. **Paciente na UPA.** Lido com `valor()` nos ids de `docs/pesquisa/tela-da-upa.md`:
   - nome: `#patient-header h3`, como na SOAP;
   - sexo: `clinical_attendance_patient_gender` (o valor do select, que a Task 3 traduz);
   - CNS: `clinical_attendance_patient_sus_nacional_card`;
   - id: `clinical_attendance_patient_id`.

   O nascimento e o CPF não estão na tela e vêm do cadastro (item 5).
4. **Cadastro.** O laço passa a percorrer todos os `label.display-field-label` do cadastro. A seção é a `legend` do
   `fieldset` mais próximo (`rotulo.closest('fieldset')`). A chave é `${secao}: ${rótulo}`, ou só `${rótulo}` fora de
   fieldset. As chaves de endereço e contato continuam iguais.
5. **Na UPA**, depois do cadastro:
   - `lido.nascimento = doCadastro('data de nascimento')`;
   - `lido.cpf = doCadastro('documentos basicos: cpf')`.
6. **`tela`.** `tela: soap ? 'soap' : upa ? 'upa' : 'renovacao'`.

- [ ] **Step 1: Implementar os seis pontos**

- [ ] **Step 2: Conferir que o Favorito ainda vira link**

Run: `node -e "import('./favorito.js').then(m => console.log(m.linkDoFavorito({ nomeNoIsaude: 'x', prescritor: {}, unidades: [], endereco: 'http://localhost:8123/' }).length))"`
Expected: um número, sem erro de sintaxe.

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 3: Verificar na UPA, com o usuário logado**

O usuário cria o Favorito na página Criar o favorito, com:
- "Nome no iSaúde" da unidade = `UPA UNIDADE DE PRONTO ATENDIMENTO DE BRUMADINHO`;
- o Receituário servido em `http://localhost:8123/`.

Ele abre o atendimento do paciente teste 261622 e clica no Favorito.

Expected:
- o Receituário abre com "TESTE DA SILVA TESTE", a idade, o CNS, o sexo "Feminino" ou "Masculino" e o endereço do
  cadastro;
- o quadro Padrões aparece;
- nada foi gravado no iSaúde.

Repetir com a unidade nomeada `UPA UNIDADE DE PRONTO` (um começo do nome).
Expected: "Este favorito não tem a unidade em que você está logado."

- [ ] **Step 4: Verificar na USF, antes de publicar (ADR 0012)**

Com o usuário logado na USF, na SOAP do paciente teste, conferir três coisas:
- o Favorito reconhece a unidade pelo topo;
- a página mostra o sexo por extenso;
- o nome da unidade na página Criar o favorito bate com o Estabelecimento do topo.

Anotar o resultado em `docs/pesquisa/tela-da-upa.md`, seção "A unidade logada".

- [ ] **Step 5: Commit**

```bash
git add favorito.js docs/pesquisa/tela-da-upa.md
git commit -m "Favorito lê a tela da UPA e confere a unidade pelo Estabelecimento"
```

---

### Task 5: Formas que o motor ainda não aceita

**Files:**
- Modify: `src/montagem.js`:
  - `FORMAS` e `SACHE`, nas linhas 210-236;
  - a lista de Unidades de fornecimento que a frase sabe escrever, na linha 247;
  - `PROPRIAS`, na linha 284;
  - `TETOS_DA_DOSE`, na linha 807.
- Modify: `src/texto.js:51`, com o plural de `envelope`.
- Test: `tests/formas.test.js`

**Interfaces:**
- Produces: as novas regras de `unidadesDeDose(produto)`. A tabela abaixo lista os códigos do catálogo e as unidades que
  `unidadesDeDose` passa a devolver.

| Código | Produto | `unidadesDeDose` |
|---|---|---|
| `BR0363597-1` | Permetrina 5% loção | `['aplicação']` (sem conversão) |
| `BR0271103-1` | Cetoconazol 2% xampu | `['aplicação']` (sem conversão) |
| `BR0271140` | Rifamicina solução tópica | `['aplicação']` (sem conversão) |
| `BR0371273-3` | Cloreto de sódio 0,9% "Solução", frasco de 250 ml | `['ml']` |
| `BR0378055` | Fosfomicina 3 g granulado, envelope | `['envelope']` |
| `BR0274806` | Acetilcisteína 600 mg granulado, envelope | `['envelope']` |
| `BR0268390` | Sais para reidratação oral, envelope | `['envelope']` |

Regras novas em `FORMAS`:
- `/^(locao|xampu|solucao topica)\b/` → `['aplicação']`, `semConversao: true`.
- `/^solucao$/` → `['ml']`.

O envelope é tratado como o sachê: quando `fornecimento.tipo === 'envelope'`, a Dose é o próprio envelope. Para isso,
`'envelope'` entra na lista que a frase sabe escrever, em `PROPRIAS`, em `TETOS_DA_DOSE` (2) e nos plurais
(`['envelope', 'envelopes']`).

- [ ] **Step 1: Escrever os testes que falham**

Os testes são um laço sobre a tabela. Para cada código:
- `assert.deepEqual(unidadesDeDose(produto), esperado)`;
- monta um item com a unidade esperada, Dose `'1'`, via `0` (oral) ou `6` (dermatológica), `dose_unica` e, nos sem
  conversão, `quantidadeDispensar: 1`;
- `assert.deepEqual(montarReceita(...).itens[0].erros, [])`.

Mais um teste:

```js
test('envelope sai como envelope', () => {
  // fosfomicina, dose única
  assert.match(frase, /Tomar 01 envelope por via oral, dose única\. Quantidade: 01 envelope/);
});
```

Use a mesma `entrada()` de `tests/padroes.test.js`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/formas.test.js`
Expected: FAIL com "A forma deste Produto não está na tabela de Unidades de dose."

- [ ] **Step 3: Implementar as regras e o envelope**

Nenhuma regra antiga pode mudar de resultado. A ordem de `FORMAS` importa: "Solução oral" e "Solução nasal" têm de
continuar caindo nas regras delas, e por isso `^solucao$` exige a forma exata.

- [ ] **Step 4: Rodar todos os testes**

Run: `node --test tests/`
Expected: PASS, com os 65 Padrões sem mudança de Frase.

- [ ] **Step 5: Commit**

```bash
git add src/montagem.js src/texto.js tests/formas.test.js
git commit -m "Loção, xampu, solução tópica, solução e envelope entram no motor"
```

---

### Task 6: Os Padrões que faltavam

**Bloqueada:** a Task 6 só começa com os valores abaixo revistos pela bula, como os outros Padrões, e confirmados pelo
Prescritor no chat. Os valores são propostas, tiradas do arquivo antigo.

**Files:**
- Modify: `dados/padroes.js`
- Modify: `docs/padroes-para-conferir.md`: as linhas saem de "Não entram ainda" e entram no Grupo delas.

**Interfaces:**
- Consumes: as unidades da Task 5. O teste é o `tests/padroes.test.js`, sem mudança.

| Grupo | Padrão | Proposta |
|---|---|---|
| Antibióticos | Fosfomicina 3 g | 1 envelope, oral, dose única. Rec.: diluir em meio copo de água, à noite, com a bexiga vazia, 2 h após a última refeição. |
| Antibióticos | Rifamicina spray | 1 aplicação, dermatológica, 2 vezes ao dia, 7 dias, 1 frasco. Rec.: sobre a ferida limpa com soro fisiológico. |
| Antivirais, antifúngicos e antiparasitários | Cetoconazol xampu 2% | 1 aplicação, capilar, 2 vezes por semana, 4 semanas, 1 frasco. Rec.: deixar agir 3 a 5 minutos e enxaguar. |
| Antivirais, antifúngicos e antiparasitários | Permetrina 5% loção | 1 aplicação, dermatológica, dose única, 1 frasco. Rec.: do pescoço para baixo, à noite, 8 a 12 h; repetir após 7 dias. |
| Respiratório | Soro fisiológico 0,9% 250 ml | 40 ml (20 em cada narina), nasal, 4 vezes ao dia, 7 dias. |
| Respiratório | Acetilcisteína 600 mg envelope | 1 envelope, oral, à noite, 7 dias. Rec.: dissolver em um copo de água. |
| Estômago e intestino | Sais para reidratação oral | 1 envelope, oral, 1 vez ao dia, 3 dias. Rec.: diluir em 1 litro de água e tomar 100 ml após cada evacuação líquida ou vômito; usar em 24 h. |

- [ ] **Step 1: Rever as propostas pela bula e confirmá-las com o Prescritor**

- [ ] **Step 2: Acrescentar os Padrões aprovados a `dados/padroes.js`, no Grupo deles**

- [ ] **Step 3: Rodar os testes**

Run: `node --test tests/`
Expected: PASS, com um teste a mais por Padrão novo.

- [ ] **Step 4: Atualizar `docs/padroes-para-conferir.md`, e commit**

```bash
git add dados/padroes.js docs/padroes-para-conferir.md
git commit -m "Padrões de envelope, loção, xampu, solução tópica e soro fisiológico"
```

---

## Fora deste plano

- **Beclometasona 250 mcg:** o catálogo grava a forma como "Solução oral". A correção é no gerador do catálogo, que não
  está neste repositório (ADR 0009).
- **Benzidamina, naratriptano e levofloxacino 750 mg:** não estão no catálogo.
- **Pediatria por peso ou idade:** fica para a versão 2 (ADR 0011).
