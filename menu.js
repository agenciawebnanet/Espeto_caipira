'use strict';

const portions = {
  M: 'Média',
  G: 'Grande',
  P: 'Pequena',
  '500 ml': '500 ml',
  '1 L': '1 litro',
};
const food = [
  ['Frango', 8], ['Calabresa', 7], ['Ubre', 8], ['Pão de alho', 7],
  ['Carne do sol', 9], ['Panceta suína', 8], ['Alcatra', 8], ['Mamilo', 8],
  ['Misto', 8], ['Coração', 8], ['Queijo coalho', 9], ['Tulipa', 9],
  ['Picanha', 10], ['Jabá', 9], ['Medalhão de frango', 12], ['Medalhão de carne', 12],
  ['Medalhão de ovo de codorna', 12], ['Medalhão de queijo', 12], ['Camarão', 15],
  ['Jacuba da casa', 6], ['Vinagrete', 3], ['Farofa bacon e calabresa', 4],
  ['Feijão tropeiro', {M: 12, G: 22}], ['Arroz carreteiro', {M: 12, G: 22}],
  ['Torresmo crocante', {P: 8, M: 12, G: 20}],
].map(([name, price], id) => ({
  id, name, variants: typeof price === 'number' ? {'': price} : price,
  category: id < 19 ? 'espetos' : 'porcoes',
}));
const drinks = [
  ['quentes', [
    ['Matuta', 8], ['Vinho Pérgola (taça)', 10], ['Vinho Reservado (taça)', 12],
    ['Red Label', 14], ['White Horse', 14], ["Ballantine’s", 14], ['Passport', 12],
    ['Domecq', 7], ['Campari', 10], ['Campari no abacaxi', 15], ['Gin', 8],
    ['Conhaque', 5], ['Domus', 5], ['Presidente', 5], ['Pitú', 3], ['Velho Barreiro', 4],
    ['Para Tudo', 4], ['Cortezano', 4], ['Conhaque de alcatrão', 10], ['Vodka', 10],
    ['Old Parr', 20], ['Copão de whisky com gelo sabor energético', null], ['Cachaça mineira', 6],
  ]],
  ['cervejas', [
    ['Skol (600 ml)', 10], ['Amstel (600 ml)', 10], ['Heineken (600 ml)', 15],
    ['Skol (lata)', 6], ['Amstel (lata)', 6], ['Heineken (lata)', 7],
    ['Heineken (long neck)', 10], ['Stella (lata)', 7], ['Stella (long neck)', 10],
    ['Budweiser (lata)', 7], ['Budweiser (long neck)', 10], ['Itaipava (lata)', 5],
    ['Ice Cabaré', 10],
  ]],
  ['refrigerantes', [
    ['Guaraná (lata)', 6], ['Pepsi (lata)', 6], ['Fanta (lata)', 6],
    ['Sprite (lata)', 6], ['Coca-Cola (lata)', 6], ['Coca-Cola (1 L)', 10],
    ['Guaraná (1 L)', 10], ['Pepsi (1 L)', 10], ['H2O', 7], ['Água tônica', 6],
  ]],
  ['aguas-sucos', [
    ['Água com gás', 4], ['Água sem gás', 3], ['Suco — sabor a confirmar', 12],
    ['Suco de laranja (1 L)', 20], ['Suco de abacaxi', {'500 ml': 12, '1 L': 20}],
  ]],
].flatMap(([category, items]) => items.map(([name, price]) => ({category, name, price})));
const menu = [...food, ...drinks.map(({category, name, price}, index) => ({
  id: food.length + index, name, category,
  variants: price !== null && typeof price === 'object' ? price : {'': price},
  photoIndex: index,
}))];
const sections = {
  espetos: 'Espetinhos', porcoes: 'Porções', quentes: 'Bebidas quentes',
  cervejas: 'Cervejas', refrigerantes: 'Refrigerantes e tônica', 'aguas-sucos': 'Águas e sucos',
};
const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
const money = value => value === null ? 'A consultar' : currency.format(value);
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const byId = id => document.getElementById(id);
const catalog = byId('catalog');
const search = byId('search');
const cartDialog = byId('cart-dialog');
const sizeDialog = byId('size-dialog');
const key = 'espeto-caipira-sacola-v1';
let filter = 'todos';
let cart = {};
let toastTimer;
try {
  const stored = JSON.parse(localStorage.getItem(key)) || {};
  for (const item of menu) {
    for (const size of Object.keys(item.variants)) {
      const line = item.id + ':' + size;
      const qty = stored[line];
      if (Number.isSafeInteger(qty) && qty > 0 && qty <= 99) cart[line] = qty;
    }
  }
} catch {}

function cardPhoto(item, index) {
  if (item.photoIndex === undefined) {
    const src = item.id === 3 ? 'pao-de-alho-inteiro.webp' : item.id + '.webp';
    return `<img src="assets/${src}" alt="" width="480" height="480" ${index >= 4 ? 'loading="lazy"' : ''}>`;
  }
  const sheet = Math.floor(item.photoIndex / 16);
  const tile = item.photoIndex % 16;
  const columns = sheet === 3 ? 2 : 4;
  const x = (tile % columns) * 100 / (columns - 1);
  const y = Math.floor(tile / columns) * 100 / (columns - 1);
  return `<span class="drink-photo" aria-hidden="true" style="background-image:url(assets/bebidas-${sheet}.webp);background-size:${columns * 100}%;background-position:${x}% ${y}%"></span>`;
}
function card(item, index) {
  const values = Object.values(item.variants);
  return `<article class="card ${index < 8 ? 'in' : ''}" style="animation-delay:${Math.min(index, 7) * 28}ms">
    <div class="photo">${cardPhoto(item, index)}</div>
    <div class="card-body"><h3>${item.name}</h3><div class="card-bottom">
    <span class="price">${values.length > 1 ? '<small>A partir de</small>' : ''}${money(values.length > 1 ? Math.min(...values) : values[0])}</span>
    <button class="add" data-item="${item.id}" aria-label="Adicionar ${item.name}">+</button></div></div>
  </article>`;
}
function renderMenu() {
  const term = normalize(search.value.trim());
  catalog.innerHTML = Object.entries(sections).map(([category, name]) => {
    if (filter !== 'todos' && filter !== category) return '';
    const items = menu.filter(item => item.category === category && normalize(item.name).includes(term));
    return items.length ? `<section><h3 class="category-title">${name} <small>${items.length}</small></h3>
      <div class="grid">${items.map(card).join('')}</div></section>` : '';
  }).join('') || '<p class="empty">Nenhum item encontrado. Tente outro nome ou categoria.</p>';
}
function cartLines() {
  return Object.entries(cart).map(([line, qty]) => {
    const [id, size] = line.split(':');
    const item = menu[Number(id)];
    const price = item.variants[size];
    return {line, qty, label: item.name + (size ? ' (' + size + ')' : ''), subtotal: price === null ? null : price * qty};
  });
}
function updateCart(focusLine, direction) {
  const lines = cartLines();
  const count = lines.reduce((sum, item) => sum + item.qty, 0);
  const total = lines.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const hasQuote = lines.some(item => item.subtotal === null);
  byId('badge').textContent = count;
  byId('bottom-count').textContent = count + (count === 1 ? ' item' : ' itens');
  byId('bottom-total').textContent = hasQuote ? (total ? money(total) + ' + consulta' : 'A consultar') : money(total);
  byId('bottom-cart').hidden = !count;
  byId('total-label').textContent = hasQuote ? 'Subtotal dos itens com preço' : 'Total dos itens';
  byId('total').textContent = money(total);
  byId('quote-note').hidden = !hasQuote;
  byId('cart-summary').hidden = !count;
  byId('cart-list').innerHTML = lines.map(({line, qty, label, subtotal}) => `<div class="cart-row">
    <div><strong>${label}</strong><br><small>${money(subtotal)}</small></div>
    <div class="qty"><button class="step" data-line="${line}" data-delta="-1" aria-label="Diminuir ${label}">−</button>
    <span>${qty}</span><button class="step" data-line="${line}" data-delta="1" aria-label="Aumentar ${label}">+</button></div>
    </div>`).join('') || '<p>Sua sacola está vazia.</p>';
  if (focusLine) {
    const replacement = Array.from(cartDialog.querySelectorAll('[data-line]')).find(button =>
      button.dataset.line === focusLine && button.dataset.delta === direction);
    (replacement || cartDialog.querySelector('[data-close]')).focus();
  }
}
function change(line, delta, keepFocus = false) {
  const qty = Math.min(99, (cart[line] || 0) + delta);
  if (qty > 0) cart[line] = qty;
  else delete cart[line];
  try { localStorage.setItem(key, JSON.stringify(cart)); } catch {}
  updateCart(keepFocus ? line : null, String(delta));
}
function notify(message) {
  const toast = byId('toast');
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ''; }, 2000);
}
function add(item, size = '') {
  change(item.id + ':' + size, 1);
  notify(item.name + ' na sacola');
}

search.addEventListener('input', renderMenu);
document.querySelector('nav').addEventListener('click', event => {
  const selected = event.target.closest('[data-category]');
  if (!selected) return;
  filter = selected.dataset.category;
  document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', button === selected));
  renderMenu();
});
catalog.addEventListener('click', event => {
  const button = event.target.closest('[data-item]');
  if (!button) return;
  const item = menu[Number(button.dataset.item)];
  if ('' in item.variants) { add(item); return; }
  byId('size-title').textContent = item.name;
  byId('sizes').innerHTML = Object.entries(item.variants).map(([size, price]) =>
    `<button class="primary choice" data-size="${size}" data-id="${item.id}"><span>${portions[size]}${size.length === 1 ? ' (' + size + ')' : ''}</span><strong>${money(price)}</strong></button>`).join('');
  sizeDialog.showModal();
});
byId('sizes').addEventListener('click', event => {
  const choice = event.target.closest('[data-size]');
  if (!choice) return;
  sizeDialog.close();
  add(menu[Number(choice.dataset.id)], choice.dataset.size);
});
for (const dialog of [sizeDialog, cartDialog]) {
  dialog.setAttribute('aria-labelledby', dialog.querySelector('h2').id || 'cart-title');
  dialog.querySelector('h2').id ||= 'cart-title';
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}
for (const id of ['top-cart', 'bottom-cart']) byId(id).addEventListener('click', () => cartDialog.showModal());
cartDialog.addEventListener('click', event => {
  const step = event.target.closest('[data-line]');
  if (step) change(step.dataset.line, Number(step.dataset.delta), true);
});
byId('cart-summary').addEventListener('submit', event => {
  event.preventDefault();
  const lines = cartLines();
  if (!lines.length) return;
  const fulfillment = byId('fulfillment').value;
  const payment = byId('payment').value;
  const total = lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0);
  const hasQuote = lines.some(line => line.subtotal === null);
  const summary = [
    '🔥 *Pedido • Espeto Caipira*',
    '',
    ...lines.map(({qty, label, subtotal}) => `${qty}× ${label} — ${money(subtotal)}`),
    '',
    hasQuote ? `💰 *Subtotal dos itens com preço:* ${money(total)}. Consulte o valor dos demais itens.` : `💰 *Total dos itens:* ${money(total)}`,
    `📦 *Recebimento:* ${fulfillment}`,
    `💳 *Pagamento:* ${payment}`,
  ];
  if (fulfillment === 'Entrega a combinar') {
    summary.push('', 'Podemos combinar o endereço e o valor da entrega?');
  }
  const url = new URL('https://wa.me/553191478790');
  url.searchParams.set('text', summary.join('\n'));
  window.location.assign(url.href);
});

renderMenu();
updateCart();

byId('view-menu').addEventListener('click', () => {
  byId('demo').hidden = true;
  byId('site-content').hidden = false;
  byId('menu-heading').focus();
});
