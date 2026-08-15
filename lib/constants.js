export const EXPENSE_CATEGORIES = {
  packaging: '📦 包材/運費',
  platform_fee: '🖥️ 平台費',
  grading_fee: '🏅 評級費',
  mileage: '🚗 里程費',
  travel: '✈️ 出差費',
  accountant: '📊 會計師費',
  equipment: '📷 設備',
  other: '其他',
};

export const KIND_LABELS = {
  BUY: '進貨',
  SELL: '銷售',
  EXPENSE: '費用',
};

export const SCOPE_LABELS = {
  biz: '商務',
  priv: '私人',
};

export const WAIT = {
  KIND: 'kind',
  SCOPE: 'scope',
  DATE: 'date',
  AMOUNT: 'amount',
  FX: 'fx',
  DESC: 'desc',
  CATEGORY: 'category',
  VENDOR: 'vendor',
  BTW: 'btw',
  PRODUCT: 'product',
  QTY: 'qty',
  UNIT_PRICE: 'unit_price',
  PLATFORM: 'platform',
  CONFIRM: 'confirm',
};

export function emptyFields() {
  return {
    kind: null,
    scope: null,
    date: null,
    currency: 'EUR',
    originalAmount: null,
    amountEur: null,
    fxRate: null,
    fxDate: null,
    desc: null,
    category: null,
    vendor: null,
    btwEur: null,
    btwAnswered: false,
    productId: null,
    productName: null,
    quantity: null,
    pricePerUnitEUR: null,
    platform: null,
  };
}

export function newDraft(id) {
  return {
    id,
    status: 'active',
    fields: emptyFields(),
    guesses: {},
    photos: [],
    productCandidates: [],
    waitingFor: WAIT.KIND,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: null,
    postedRef: null,
  };
}
