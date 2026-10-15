# Estoque a Granel

Painel para controlar entradas e retiradas de varios itens, medidos em pacotes. Cada item tem um painel de saldo, entradas e saidas; as atividades recentes reúnem movimentacoes de todos eles. O sistema registra nome, data e, nas retiradas, o setor de destino.

## Configuracao

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No painel do projeto, abra **SQL Editor**, cole o conteudo atualizado de `supabase-schema.sql` e execute. Se voce ja havia executado a versao anterior, execute esta versao tambem: ela adiciona o cadastro de itens e vincula o historico existente a **Saco a granel** sem apagar movimentacoes.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **publishable** (ou a chave legada **anon/public**).
4. Coloque esses valores nas constantes `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em `supabase.js`. Chaves publishable/anon são apropriadas para uso no navegador com as politicas RLS configuradas. Nunca coloque a chave `service_role` ou uma secret key no frontend.
5. Sirva esta pasta com um servidor web local ou publique-a em um servico de hospedagem de sites estaticos. Por usar modulos JavaScript, nao abra `index.html` diretamente via `file://`.

## Uso

- O cadastro inicial inclui **Saco a granel**; use **Adicionar item ao estoque** para criar outros itens com uma descricao propria.
- Escolha o item em cada movimentacao. Registre a primeira quantidade recebida como **Entrada no estoque**; cada item comeca com saldo zero.
- Para cada retirada, informe quantidade em pacotes, data, setor de destino e nome de quem esta registrando.
- O sistema impede retirar mais pacotes do que o saldo daquele item, inclusive quando duas pessoas registram ao mesmo tempo.
- O painel mostra saldo, totais de entradas e saidas por item; as dez atividades recentes incluem movimentacoes de todos os itens.

## Acesso e privacidade

O painel nao tem login, conforme o escopo definido. Assim, qualquer pessoa que tenha acesso ao endereco publicado pode consultar e registrar movimentacoes. As politicas do banco permitem leitura publica, mas gravacoes passam por uma funcao que valida os dados e o saldo. Para uso publico ou dados que exijam controle por pessoa, sera necessario adicionar autenticacao e restringir as politicas do Supabase.

