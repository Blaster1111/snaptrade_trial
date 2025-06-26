import express from 'express';
import {
  connectSnaptradeBroker,
  checkBrokerConnection,
  getAllConnections,
  getAllAccounts,
  getAccountHoldings,
  getTransactionHistory,
  searchAccountSymbols,
  checkOrderImpact,
  placeCheckedOrder,
  cancelOrder,
  placeOrder
} from '../controllers/snapTradeController';

const router = express.Router();

router.post('/connect-broker', connectSnaptradeBroker);
router.post('/check-broker-connection', checkBrokerConnection);
router.post('/get-connections', getAllConnections);
router.post('/get-accounts', getAllAccounts);
router.post('/get-account-holdings', getAccountHoldings);
router.post('/get-transactions', getTransactionHistory);
router.post('/search-acc-symbols', searchAccountSymbols);
router.post('/impact', checkOrderImpact);
router.post('/place-checked-order', placeCheckedOrder);
router.post('/place-order', placeOrder);
router.post('/cancel-order', cancelOrder);

export default router;