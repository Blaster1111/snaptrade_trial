'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface Account {
  id: string;
  name: string;
  number: string;
  institutionName: string;
  balance: number | string | null;
  status: string;
  type: string;
}

interface Holding {
  account: {
    id: string;
    name: string;
    institutionName: string;
    balance: number;
  };
  positions: {
    symbol: string;
    description: string;
    units: number;
    price: number;
    averagePurchasePrice: number;
    openPnL: number;
    marketValue: number;
  }[];
  optionPositions: {
    ticker: string;
    optionType: string;
    strikePrice: number;
    expirationDate: string;
    units: number;
    price: number;
    marketValue: number;
  }[];
  totalValue: {
    value: number;
    currency: string;
  };
}

interface Transaction {
  id: string;
  symbol: string;
  description: string;
  type: string;
  optionType: string;
  units: number;
  price: number;
  amount: number;
  currency: string;
  tradeDate: string;
  settlementDate: string;
  fee: number;
  institution: string;
}

interface OrderImpactResponse {
  data: {
    trade: { id: string };
    trade_impacts?: Array<{ remaining_cash?: number }>;
  };
}

interface PlaceOrderResponse {
  data: { brokerage_order_id: string };
}

interface CancelOrderResponse {
  data: { status: string };
}

type OrderResponse = OrderImpactResponse | PlaceOrderResponse | CancelOrderResponse;

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    if ('response' in e) {
      const errResp = (e as any).response;
      if (errResp && errResp.data && typeof errResp.data.error === 'string') {
        return errResp.data.error;
      }
    }
    if ('message' in e && typeof (e as any).message === 'string') {
      return (e as any).message;
    }
  }
  return 'Unknown error occurred';
}

export default function BrokerPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.connectionId || '';

  const [userId, setUserId] = useState<string>('');
  const [userSecret, setUserSecret] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [holdings, setHoldings] = useState<Holding | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tradeId, setTradeId] = useState<string>('');
  const [lastOrderResponse, setLastOrderResponse] = useState<OrderResponse | null>(null);

  // Symbol search states and types
  interface SymbolResult {
    symbol: string;
    description: string;
    universal_symbol_id: string;
  }
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('');
  const [symbolResults, setSymbolResults] = useState<SymbolResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // orderForm type:
  interface OrderForm {
    action: 'BUY' | 'SELL';
    universal_symbol_id: string;
    order_type: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
    time_in_force: 'Day' | 'GTC' | 'FOK' | 'IOC';
    units: number | '';
    price: number | string;
    stop: number | string;
    notional_value: number | string;
  }
  const [orderForm, setOrderForm] = useState<OrderForm>({
    action: 'BUY',
    universal_symbol_id: '',
    order_type: 'Market',
    time_in_force: 'Day',
    units: 1,
    price: '' as string | number,
    stop: '' as string | number,
    notional_value: '' as string | number,
  });

  const [placeCheckedWaitConfirm, setPlaceCheckedWaitConfirm] = useState(true);
  const [cancelBrokerageOrderId, setCancelBrokerageOrderId] = useState('');

  // Load credentials from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('snaptrade_userId') || '';
    const storedUserSecret = localStorage.getItem('snaptrade_userSecret') || '';
    if (!storedUserId || !storedUserSecret) {
      alert('Please login and connect brokers first.');
      router.push('/');
      return;
    }
    setUserId(storedUserId);
    setUserSecret(storedUserSecret);
  }, [router]);

  // Fetch accounts once userId and secret available
  useEffect(() => {
    if (userId && userSecret) {
      fetchAccounts();
    }
  }, [userId, userSecret]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.post<{ accounts: Account[] }>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/get-accounts',
        {
          userId,
          userSecret,
        }
      );
      const accountsData: Account[] = res.data.accounts || [];
      setAccounts(accountsData);
      setSelectedAccountId(accountsData.length > 0 ? accountsData[0].id : '');
      setError('');
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load accounts');
      setSelectedAccountId('');
    } finally {
      setLoading(false);
    }
  };

  const fetchHoldings = async () => {
    if (!selectedAccountId) {
      alert('Select an account');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post<Holding>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/get-account-holdings',
        {
          userId,
          userSecret,
          accountId: selectedAccountId,
        }
      );
      setHoldings(res.data);
      setError('');
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load holdings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccountId) {
      alert('Select an account');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post<{ transactions: Transaction[] }>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/get-transactions',
        {
          userId,
          userSecret,
          accountId: selectedAccountId,
          startDate: '2023-01-01',
          endDate: '2025-06-24',
        }
      );
      setTransactions(res.data.transactions);
      setError('');
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Symbol search effect with debounce
  useEffect(() => {
    if (symbolSearchTerm.length < 2) {
      setSymbolResults([]);
      setSearchError('');
      return;
    }
    if (!selectedAccountId) {
      setSearchError('Select an account before searching symbols');
      setSymbolResults([]);
      return;
    }
    if (!userId || !userSecret) {
      setSearchError('Missing user credentials');
      setSymbolResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const res = await axios.post<{ symbols: Array<{ symbol: string; description?: string; name?: string; id: string }> }>(
          'https://snaptrade-trial.onrender.com/api/snaptrade/search-acc-symbols',
          {
            userId,
            userSecret,
            accountId: selectedAccountId,
            substring: symbolSearchTerm,
          }
        );
        const symbols = res.data.symbols || [];
        const formattedSymbols: SymbolResult[] = symbols.map((sym) => ({
          symbol: sym.symbol,
          description: sym.description || sym.name || '',
          universal_symbol_id: sym.id,
        }));
        setSymbolResults(formattedSymbols);
      } catch (e: unknown) {
        setSearchError(getErrorMessage(e) || 'Failed to search symbols');
        setSymbolResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [symbolSearchTerm, selectedAccountId, userId, userSecret]);

  const onOrderInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setOrderForm((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value === '' || isNaN(Number(value))
            ? ''
            : Number(value)
          : value,
    }));
  };

  const checkOrderImpact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      alert('Select an account');
      return;
    }
    try {
      const payload = {
        userId,
        userSecret,
        account_id: selectedAccountId,
        action: orderForm.action,
        universal_symbol_id: orderForm.universal_symbol_id,
        order_type: orderForm.order_type,
        time_in_force: orderForm.time_in_force,
        price: orderForm.price === '' ? undefined : orderForm.price,
        stop: orderForm.stop === '' ? undefined : orderForm.stop,
        units: orderForm.units,
        notional_value: orderForm.notional_value === '' ? undefined : orderForm.notional_value,
      };
      const res = await axios.post<OrderImpactResponse>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/impact',
        payload
      );
      alert(
        `Order Impact Check Successful\nTrade ID: ${res.data.data.trade.id}\nRemaining Cash: ${res.data.data.trade_impacts?.[0]?.remaining_cash}`
      );
      setTradeId(res.data.data.trade.id);
      setLastOrderResponse(res.data);
    } catch (e: unknown) {
      alert('Failed to check order impact: ' + getErrorMessage(e));
    }
  };

  const placeCheckedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeId) {
      alert('No tradeId. Please check order impact first.');
      return;
    }
    try {
      const res = await axios.post<PlaceOrderResponse>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/place-checked-order',
        {
          userId,
          userSecret,
          tradeId,
          wait_to_confirm: placeCheckedWaitConfirm,
        }
      );
      alert('Order placed successfully. Brokerage Order ID: ' + res.data.data.brokerage_order_id);
      setLastOrderResponse(res.data);
    } catch (e: unknown) {
      alert('Failed to place checked order: ' + getErrorMessage(e));
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      alert('Select an account');
      return;
    }
    try {
      const payload = {
        userId,
        userSecret,
        account_id: selectedAccountId,
        action: orderForm.action,
        universal_symbol_id: orderForm.universal_symbol_id,
        symbol: null,
        order_type: orderForm.order_type,
        time_in_force: orderForm.time_in_force,
        price: orderForm.price === '' ? undefined : orderForm.price,
        stop: orderForm.stop === '' ? undefined : orderForm.stop,
        units: orderForm.units,
        notional_value: orderForm.notional_value === '' ? undefined : orderForm.notional_value,
      };
      const res = await axios.post<PlaceOrderResponse>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/place-order',
        payload
      );
      alert('Force order placed successfully. Brokerage Order ID: ' + res.data.data.brokerage_order_id);
      setLastOrderResponse(res.data);
    } catch (e: unknown) {
      alert('Failed to place order: ' + getErrorMessage(e));
    }
  };

  const cancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      alert('Select an account');
      return;
    }
    if (!cancelBrokerageOrderId.trim()) {
      alert('Enter brokerage order ID to cancel');
      return;
    }
    try {
      const res = await axios.post<CancelOrderResponse>(
        'https://snaptrade-trial.onrender.com/api/snaptrade/cancel-order',
        {
          userId,
          userSecret,
          accountId: selectedAccountId,
          brokerage_order_id: cancelBrokerageOrderId.trim(),
        }
      );
      alert('Cancel request sent. Status: ' + res.data.data.status);
      setLastOrderResponse(res.data);
    } catch (e: unknown) {
      alert('Failed to cancel order: ' + getErrorMessage(e));
    }
  };

  const formatBalance = (balance: number | string | null) => {
    if (balance === null || balance === undefined) return '0.00';
    const num = typeof balance === 'number' ? balance : Number(balance);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (!userId || !userSecret) {
    return <p className="p-6">Loading user credentials...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-semibold mb-4">Brokerage Details</h1>
      {/* Accounts Select */}
      <div>
        <label htmlFor="accountSelect" className="font-semibold">
          Select Account:
        </label>
        <select
          id="accountSelect"
          className="ml-4 border px-2 py-1 rounded"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          <option value="">-- Select Account --</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.institutionName}) - {formatBalance(acc.balance)}
            </option>
          ))}
        </select>
        <button
          onClick={fetchHoldings}
          disabled={!selectedAccountId}
          className="ml-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Load Holdings
        </button>
        <button
          onClick={fetchTransactions}
          disabled={!selectedAccountId}
          className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Load Transactions
        </button>
      </div>

      {/* Holdings */}
      {holdings && (
        <section className="border p-4 rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Holdings for {holdings.account.name}</h2>
          <div>
            Total Value:{' '}
            {holdings.totalValue?.value ? holdings.totalValue.value.toFixed(2) : '0.00'}{' '}
            {holdings.totalValue?.currency || ''}
          </div>
          <div className="mt-2">
            <h3 className="font-semibold">Positions</h3>
            <ul>
              {holdings.positions.map((pos, idx) => (
                <li key={`${pos.symbol}-${idx}`} className="border-b py-1">
                  <strong>{pos.symbol}</strong>: {pos.description} — Units: {pos.units}, Price:{' '}
                  {pos.price}, Market Value: {pos.marketValue.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold">Option Positions</h3>
            <ul>
              {holdings.optionPositions.map((opt, idx) => (
                <li key={`${opt.ticker}-${idx}`} className="border-b py-1">
                  <strong>{opt.ticker}</strong> ({opt.optionType}) Strike: {opt.strikePrice},{' '}
                  Expiry: {new Date(opt.expirationDate).toLocaleDateString()}, Units: {opt.units},{' '}
                  Market Value: {opt.marketValue.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <section className="border p-4 rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Transactions</h2>
          <ul>
            {transactions.map((tx) => (
              <li key={tx.id} className="border-b py-1">
                <strong>{tx.description}</strong> ({tx.type}) — Symbol: {tx.symbol} — Amount:{' '}
                {tx.amount} {tx.currency} — Trade Date:{' '}
                {new Date(tx.tradeDate).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Trading Forms */}
      <section className="border p-4 rounded bg-white shadow max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Trading</h2>

        {/* Symbol Search */}
        <div className="mb-4">
          <label htmlFor="symbolSearch" className="font-semibold block mb-1">
            Search Symbol
          </label>
          <input
            type="text"
            id="symbolSearch"
            placeholder="Type symbol or name..."
            value={symbolSearchTerm}
            onChange={(e) => setSymbolSearchTerm(e.target.value)}
            className="border p-2 rounded w-full"
          />
          {searchError && <p className="text-red-600 mt-1">{searchError}</p>}
          {searchLoading && <p className="text-gray-600 mt-1">Searching...</p>}
          {symbolResults.length > 0 && (
            <ul className="border rounded mt-1 max-h-48 overflow-y-auto bg-white z-10 relative">
              {symbolResults.map((sym) => (
                <li
                  key={sym.universal_symbol_id}
                  className="p-2 hover:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    setOrderForm((prev) => ({
                      ...prev,
                      universal_symbol_id: sym.universal_symbol_id,
                    }));
                    setSymbolSearchTerm(sym.symbol);
                    setSymbolResults([]);
                  }}
                >
                  <strong>{sym.symbol}</strong> - {sym.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Check Order Impact */}
        <form onSubmit={checkOrderImpact} className="mb-6 space-y-2">
          <h3 className="font-semibold">Check Order Impact</h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              required
              name="action"
              value={orderForm.action}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            >
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
            <input
              required
              name="universal_symbol_id"
              placeholder="Universal Symbol ID (UUID)"
              value={orderForm.universal_symbol_id}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            />
            <select
              required
              name="order_type"
              value={orderForm.order_type}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            >
              <option value="Market">Market</option>
              <option value="Limit">Limit</option>
              <option value="Stop">Stop</option>
              <option value="StopLimit">StopLimit</option>
            </select>
            <select
              required
              name="time_in_force"
              value={orderForm.time_in_force}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            >
              <option value="Day">Day</option>
              <option value="GTC">Good Til Cancel</option>
              <option value="FOK">Fill Or Kill</option>
              <option value="IOC">Immediate Or Cancel</option>
            </select>
            <input
              type="number"
              step="any"
              min="0"
              name="units"
              placeholder="Units (shares/contracts)"
              value={orderForm.units}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            />
            <input
              type="number"
              step="any"
              min="0"
              name="price"
              placeholder="Price (limit/stop price)"
              value={orderForm.price === '' ? '' : orderForm.price}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            />
            <input
              type="number"
              step="any"
              min="0"
              name="stop"
              placeholder="Stop Price (for Stop/StopLimit)"
              value={orderForm.stop === '' ? '' : orderForm.stop}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            />
            <input
              type="number"
              step="any"
              min="0"
              name="notional_value"
              placeholder="Notional Value (Market order only)"
              value={orderForm.notional_value === '' ? '' : orderForm.notional_value}
              onChange={onOrderInputChange}
              className="border p-1 rounded"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700">
            Check Impact
          </button>
        </form>

        {/* Place Checked Order */}
        <form onSubmit={placeCheckedOrder} className="mb-6 space-y-2">
          <h3 className="font-semibold">Place Checked Order</h3>
          <input
            type="text"
            placeholder="Trade ID (from impact check)"
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
            className="border p-2 rounded w-full"
            required
          />
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={placeCheckedWaitConfirm}
              onChange={() => setPlaceCheckedWaitConfirm((v) => !v)}
            />
            <span>Wait to Confirm</span>
          </label>
          <button type="submit" className="bg-green-600 text-white py-2 rounded w-full hover:bg-green-700">
            Place Checked Order
          </button>
        </form>

        {/* Place Order without check */}
        <form onSubmit={placeOrder} className="mb-6 space-y-2">
          <h3 className="font-semibold">Place Order (Without Impact Check)</h3>
          <button type="submit" className="bg-purple-600 text-white py-2 rounded w-full hover:bg-purple-700">
            Place Order
          </button>
        </form>

        {/* Cancel Order */}
        <form onSubmit={cancelOrder} className="space-y-2">
          <h3 className="font-semibold">Cancel Order</h3>
          <input
            type="text"
            placeholder="Brokerage Order ID"
            value={cancelBrokerageOrderId}
            onChange={(e) => setCancelBrokerageOrderId(e.target.value)}
            className="border p-2 rounded w-full"
            required
          />
          <button type="submit" className="bg-red-600 text-white py-2 rounded w-full hover:bg-red-700">
            Cancel Order
          </button>
        </form>

        {/* Last Order Response */}
        {lastOrderResponse && (
          <pre className="mt-4 p-2 whitespace-pre-wrap border rounded bg-gray-100 max-h-64 overflow-y-auto text-xs">
            {JSON.stringify(lastOrderResponse, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}