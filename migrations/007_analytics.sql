-- 007_analytics.sql
--
-- Un solo campo nuovo: il valore medio di un cliente/appuntamento, inserito
-- volontariamente dal titolare (mai stimato automaticamente da noi) per
-- calcolare una stima di ROI nella dashboard. Se non impostato, la sezione
-- ROI semplicemente non compare — non mostriamo mai un numero inventato.

alter table configurazioni_cliente
  add column if not exists valore_medio_cliente numeric;

comment on column configurazioni_cliente.valore_medio_cliente is 'Valore medio (in euro) di un appuntamento/cliente, inserito manualmente dal titolare. Usato SOLO per mostrare una stima di ROI nella dashboard — mai fatturato garantito.';
