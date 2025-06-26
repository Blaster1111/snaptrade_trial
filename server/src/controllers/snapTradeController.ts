import { Request, Response } from 'express';
import { snaptrade } from '../lib/snapTradeClient';
import { BadRequestError } from '../errors';


//logic: check user registered or not -> if registered check conncetion already exists if yes then refresh conncetion else create new connection
//if not registered then create new user and create connection. add user secret to db step left here.
export const connectSnaptradeBroker = async (req: Request, res: Response) => {
  try {
    let { userId, broker, userSecret } = req.body;
    if (!userId || !broker) {
      throw BadRequestError('Missing required fields: userId, broker');
    }

    if (userSecret) {
      const connections = await snaptrade.connections.listBrokerageAuthorizations({
        userId,
        userSecret,
      });
      const existingConnection = connections.data.find(
        (conn) => conn.brokerage?.slug?.toLowerCase() === broker.toLowerCase() && !conn.disabled
      );
      if (existingConnection && existingConnection.id) {
        try {
          await snaptrade.connections.refreshBrokerageAuthorization({
            authorizationId: existingConnection.id,
            userId,
            userSecret,
          });
        } catch (refreshError) {
          console.warn(`Failed to refresh connection ${existingConnection.id}:`, refreshError);
        }
        res.status(200).json({
          message: `Existing connection found; refresh triggered for broker ${broker}`,
          userSecret,
          connectionStatus: {
            existingConnectionId: existingConnection.id,
            broker,
          },
        });
        return;  // RETURN here!
      } else {
        try {
          const connectionResponse = await snaptrade.authentication.loginSnapTradeUser({
            userId,
            userSecret,
            broker,
            immediateRedirect: true,
          });
          res.status(200).json({
            message: 'Broker connection initiated',
            userSecret,
            connectionStatus: connectionResponse.data,
          }); 
          return;
        } catch (error) {
          console.error('Error refreshing connection:', error);
          res.status(500).json({ error: 'Failed to refresh existing connection' });
          return;
        }
      }
    }

    // If no userSecret, register user and login
    const resRegis = await snaptrade.authentication.registerSnapTradeUser({
      userId,
    });
    userSecret = resRegis.data.userSecret as string;

    const connectionResponse = await snaptrade.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      broker,
      immediateRedirect: true,
    });

   res.status(200).json({
      message: 'Broker connection initiated',
      userSecret,
      connectionStatus: connectionResponse.data,
    });
    return;
  } catch (err) {
    console.error('Error connecting broker:', err);
    res.status(500).json({ error: 'An error occurred while connecting to the broker' });
    return;
  }
};

//check connection and refresh it
export const checkBrokerConnection = async (req: Request, res: Response) => {
  try {
    const { userId, userSecret, brokerId } = req.body;

    if (!userId || !userSecret || !brokerId) {
      throw BadRequestError('Missing required fields: userId, userSecret, brokerId');
    }

    const connections = await snaptrade.connections.listBrokerageAuthorizations({
      userId,
      userSecret,
    });

    const hasConnection = connections.data.some(
      (conn) => conn.brokerage && conn.brokerage.id === brokerId && !conn.disabled
    );

    const filteredConnections = connections.data.filter(
      (conn) => conn.brokerage && conn.brokerage.id === brokerId
    );

    res.status(200).json({
      hasActiveConnection: hasConnection,
      connections: filteredConnections,
    });
  } catch (err) {
    console.error('Error checking broker connection:', err);
    res.status(500).json({ error: 'An error occurred while checking broker connection' });
  }
};

//get all the connections of a user and refresh them
export const getAllConnections = async (req: Request, res: Response) => {
  try {
    const { userId, userSecret } = req.body;

    if (!userId || !userSecret) {
      throw BadRequestError('Missing required fields: userId, userSecret');
    }

    const connections = await snaptrade.connections.listBrokerageAuthorizations({
      userId,
      userSecret,
    });

    const refreshedConnections = await Promise.all(
      connections.data.map(async (conn) => {
        if (!conn.disabled && conn.id) {
          try {
            await snaptrade.connections.refreshBrokerageAuthorization({
              authorizationId: conn.id,
              userId,
              userSecret,
            });
          } catch (refreshError) {
            console.warn(`Failed to refresh connection ${conn.id}:`, refreshError);
          }
        }
        return {
          id: conn.id,
          brokerName: conn.brokerage?.name,
          logoUrl: conn.brokerage?.aws_s3_logo_url,
          disabled: conn.disabled,
        };
      })
    );

    res.status(200).json({
      connections: refreshedConnections,
    });
  } catch (err) {
    console.error('Error fetching connections:', err);
    res.status(500).json({ error: 'An error occurred while fetching connections' });
  }
};


//get all accounts for a user
export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const { userId, userSecret } = req.body;

    if (!userId || !userSecret) {
      throw BadRequestError('Missing required fields: userId, userSecret');
    }

    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId,
      userSecret,
    });

    const accounts = (accountsRes.data || []).map((account) => ({
      id: account.id,
      name: account.name,
      number: account.number,
      institutionName: account.institution_name,
      balance: account.balance?.total,
      status: account.status,
      type: account.meta?.type,
    }));

    res.status(200).json({
      accounts,
    });
  } catch (err) {
    console.error('Error fetching accounts:', err);

    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err });
      return;
    }

    res.status(500).json({ error: 'An error occurred while fetching accounts' });
  }
};

//gets teh holdingss for a specific brokerage account of a user
export const  getAccountHoldings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userSecret, accountId } = req.body;

    if (!userId || !userSecret || !accountId) {
      throw BadRequestError('Missing required fields: userId, userSecret, accountId');
    }

    const holdingsRes = await snaptrade.accountInformation.getUserHoldings({
      userId,
      userSecret,
      accountId,
    });

    const orderedHoldings = {
      account: {
        id: holdingsRes.data.account?.id,
        name: holdingsRes.data.account?.name,
        institutionName: holdingsRes.data.account?.institution_name,
        balance: holdingsRes.data.account?.balance?.total,
      },
      positions: (holdingsRes.data.positions || []).map((pos) => {
        const units = (pos.units || 0) + (pos.fractional_units || 0);
        const price = pos.price || 0;
        return {
          symbol: pos.symbol?.symbol?.symbol,
          description: pos.symbol?.symbol?.description,
          units,
          price,
          averagePurchasePrice: pos.average_purchase_price,
          openPnL: pos.open_pnl,
          marketValue: units * price,
        };
      }),
      optionPositions: (holdingsRes.data.option_positions || []).map((opt) => {
        const units = opt.units || 0;
        const price = opt.price || 0;
        return {
          ticker: opt.symbol?.option_symbol?.ticker,
          optionType: opt.symbol?.option_symbol?.option_type,
          strikePrice: opt.symbol?.option_symbol?.strike_price,
          expirationDate: opt.symbol?.option_symbol?.expiration_date,
          units,
          price,
          marketValue: units * price,
        };
      }),
      totalValue: holdingsRes.data.total_value,
    };

    res.status(200).json(orderedHoldings);
  } catch (err) {
    console.error('Error fetching account holdings:', err);

    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err });
      return;
    }

    res.status(500).json({ error: 'An error occurred while fetching account holdings' });
  }
};


//gets the transaction history for a specific brokerage account of a user
export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userSecret, accountId, startDate, endDate, offset, limit, type } = req.body;

    if (!userId || !userSecret || !accountId) {
      throw BadRequestError('Missing required fields: userId, userSecret, accountId');
    }

    const transactionsRes = await snaptrade.accountInformation.getAccountActivities({
      accountId,
      userId,
      userSecret,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      offset: offset || 0,
      limit: limit || 1000,
      type: type || undefined,
    });
    console.log('Transactions response:', transactionsRes.data);
    const transactions = (transactionsRes.data.data || []).map((tx: any) => ({
      id: tx.id,
      symbol: tx.symbol?.symbol,
      description: tx.description,
      type: tx.type,
      optionType: tx.option_type,
      units: tx.units,
      price: tx.price,
      amount: tx.amount,
      currency: tx.currency?.code,
      tradeDate: tx.trade_date,
      settlementDate: tx.settlement_date,
      fee: tx.fee,
      institution: tx.institution,
    }));
    res.status(200).json({
      transactions,
      pagination: transactionsRes.data.pagination,
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);

    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err });
      return;
    }

    res.status(500).json({ error: 'An error occurred while fetching transactions' });
  }
};


export const searchAccountSymbols = async (req: Request, res: Response) => {
  try {
    const { userId, userSecret, accountId, substring } = req.body;

    if (!userId || !userSecret || !accountId || !substring) {
      throw BadRequestError(
        'Missing required fields: userId, userSecret, accountId, substring'
      );
    }

    const response = await snaptrade.referenceData.symbolSearchUserAccount({
      userId,
      userSecret,
      accountId,
      substring,
    });

    res.status(200).json({
      symbols: response.data,
    });
  } catch (err) {
    console.error('Error searching account symbols:', err);
    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err });
      return;
    }
    res.status(500).json({ error: 'An error occurred while searching symbols' });
  }
};


export const checkOrderImpact = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      userSecret,
      account_id,
      action,
      universal_symbol_id,
      order_type,
      time_in_force,
      price,
      stop,
      units,
      notional_value,
    } = req.body;
    console.log('Checking order impact with params:', req.body);
    if (
      !userId ||
      !userSecret ||
      !account_id ||
      !action ||
      !universal_symbol_id ||
      !order_type ||
      !time_in_force
    ) {
      throw BadRequestError(
        'Missing required fields: userId, userSecret, account_id, action, universal_symbol_id, order_type, time_in_force'
      );
    }

    // Build params object (omit undefined fields)
    const params: any = {
      userId,
      userSecret,
      account_id,
      action,
      universal_symbol_id,
      order_type,
      time_in_force,
    };
    if (price !== undefined) params.price = price;
    if (stop !== undefined) params.stop = stop;
    if (units !== undefined) params.units = units;
    if (notional_value !== undefined) params.notional_value = notional_value;

    const response = await snaptrade.trading.getOrderImpact(params);
    res.status(200).json({
      message: 'Order impact fetched successfully',
      data: response.data,
    });
  } catch (error) {
    console.error('Error checking order impact:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error });
      return;
    }
    res.status(500).json({ error: 'Failed to check order impact' });
  }
};

export const placeCheckedOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userSecret, tradeId, wait_to_confirm } = req.body;

    if (!userId || !userSecret || !tradeId) {
      throw BadRequestError('Missing required fields: userId, userSecret, tradeId');
    }

    const response = await snaptrade.trading.placeOrder({
      userId,
      userSecret,
      tradeId,
      wait_to_confirm: wait_to_confirm === undefined ? true : wait_to_confirm,
    });

    res.status(200).json({
      message: 'Order placed successfully',
      data: response.data,
    });
  } catch (error) {
    console.error('Error placing checked order:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error });
      return;
    }
    res.status(500).json({ error: 'Failed to place checked order' });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userSecret, accountId, brokerage_order_id } = req.body;

    if (!userId || !userSecret || !accountId || !brokerage_order_id) {
      throw BadRequestError(
        'Missing required fields: userId, userSecret, accountId, brokerage_order_id'
      );
    }

    const response = await snaptrade.trading.cancelUserAccountOrder({
      userId,
      userSecret,
      accountId,
      brokerage_order_id,
    });

    res.status(200).json({
      message: 'Order cancellation attempted',
      data: response.data,
    });
  } catch (error) {
    console.error('Error canceling order:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error });
      return;
    }
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

export const placeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      userSecret,
      account_id,
      action,
      universal_symbol_id,
      symbol,
      order_type,
      time_in_force,
      price,
      stop,
      units,
      notional_value,
    } = req.body;

    if (
      !userId ||
      !userSecret ||
      !account_id ||
      !action ||
      (!universal_symbol_id && !symbol) || 
      !order_type ||
      !time_in_force
    ) {
      throw BadRequestError(
        'Missing required fields: userId, userSecret, account_id, action, universal_symbol_id or symbol, order_type, time_in_force'
      );
    }

    const params: any = {
      userId,
      userSecret,
      account_id,
      action,
      order_type,
      time_in_force,
    };

    if (universal_symbol_id) {
      params.universal_symbol_id = universal_symbol_id;
      params.symbol = null;
    } else {
      params.symbol = symbol;
      params.universal_symbol_id = null;
    }

    if (price !== undefined) params.price = price;
    if (stop !== undefined) params.stop = stop;
    if (units !== undefined) params.units = units;
    if (notional_value !== undefined) params.notional_value = notional_value;

    const response = await snaptrade.trading.placeForceOrder(params);

    res.status(200).json({
      message: 'Order placed successfully',
      data: response.data,
    });
  } catch (error) {
    console.error('Error placing order:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error });
      return;
    }
    res.status(500).json({ error: 'Failed to place order' });
  }
};