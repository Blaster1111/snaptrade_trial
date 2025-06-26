'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Connection {
  id: string;
  brokerName: string;
  logoUrl?: string | null;
  disabled: boolean;
}

export default function HomePage() {
  // User credentials input by user
  const [userId, setUserId] = useState('');
  const [userSecret, setUserSecret] = useState('');

  // Connect broker form inputs and states
  const [brokerInput, setBrokerInput] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMessage, setConnectMessage] = useState('');

  // Connections list
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState('');

  // Flag to determine if we should fetch connections
  const [credentialsSubmitted, setCredentialsSubmitted] = useState(false);

  // On mount, try to load credentials from localStorage and pre-fill inputs
  useEffect(() => {
    const storedUserId = localStorage.getItem('snaptrade_userId');
    const storedUserSecret = localStorage.getItem('snaptrade_userSecret');
    if (storedUserId && storedUserSecret) {
      setUserId(storedUserId);
      setUserSecret(storedUserSecret);
      setCredentialsSubmitted(true);
    }
  }, []);

  // Fetch connections after userId and userSecret provided
  useEffect(() => {
    if (credentialsSubmitted && userId && userSecret) {
      fetchConnections(userId, userSecret);
    }
  }, [credentialsSubmitted, userId, userSecret]);

  const fetchConnections = async (uid: string, secret: string) => {
    setLoadingConnections(true);
    setConnectionsError('');
    try {
      const res = await axios.post('http://localhost:4000/api/snaptrade/get-connections', {
        userId: uid,
        userSecret: secret,
      });
      setConnections(res.data.connections || []);
      setConnectionsError('');
    } catch (e: any) {
      setConnectionsError(e.response?.data?.error || 'Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleConnectBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !brokerInput) {
      setConnectMessage('User ID and Broker are required');
      return;
    }
    setConnectLoading(true);
    setConnectMessage('');
    try {
      const res = await axios.post('http://localhost:4000/api/snaptrade/connect-broker', {
        userId,
        userSecret,
        broker: brokerInput.toUpperCase(),
      });
      const { connectionStatus, userSecret: newUserSecret } = res.data;

      // If new userSecret is provided by API, update state and persist it
      if (newUserSecret && newUserSecret !== userSecret) {
        setUserSecret(newUserSecret);
        localStorage.setItem('snaptrade_userSecret', newUserSecret);
      }

      if (connectionStatus?.redirectURI) {
        setConnectMessage('Redirecting to broker authorization...');
        window.location.href = connectionStatus.redirectURI;
        return;
      }

      setConnectMessage('Broker connection initiated successfully.');

      // Reload connections with updated secret if any
      fetchConnections(userId, newUserSecret || userSecret);
    } catch (err: any) {
      setConnectMessage(err.response?.data?.error || 'Error connecting broker');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !userSecret.trim()) {
      alert('Please enter both User ID and User Secret');
      return;
    }
    // Save credentials to localStorage
    localStorage.setItem('snaptrade_userId', userId.trim());
    localStorage.setItem('snaptrade_userSecret', userSecret.trim());

    setCredentialsSubmitted(true);
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold mb-6 text-center">SnapTrade Dashboard</h1>

      {/* Enter User Credentials */}
      {!credentialsSubmitted && (
        <section className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Enter SnapTrade Credentials</h2>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="password"
              placeholder="User Secret"
              value={userSecret}
              onChange={(e) => setUserSecret(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <button
              type="submit"
              className="w-full py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Submit
            </button>
          </form>
        </section>
      )}

      {/* Main Content after credentials */}
      {credentialsSubmitted && (
        <>
          {/* Connect Broker Form */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Connect a New Broker</h2>
            <form onSubmit={handleConnectBroker} className="space-y-4 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Broker Name (e.g., ROBINHOOD)"
                value={brokerInput}
                onChange={(e) => setBrokerInput(e.target.value.toUpperCase())}
                className="w-full border p-2 rounded"
                disabled={connectLoading}
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                disabled={connectLoading}
              >
                {connectLoading ? 'Connecting...' : 'Connect Broker'}
              </button>
            </form>
            {connectMessage && <p className="mt-3 text-center text-gray-700">{connectMessage}</p>}
          </section>

          {/* Connections List */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Your Connected Brokerages</h2>
            {loadingConnections && <p>Loading connected brokerages...</p>}
            {connectionsError && <p className="text-red-600">{connectionsError}</p>}
            {!loadingConnections && connections.length === 0 && (
              <p className="text-gray-600">No connected brokerages found.</p>
            )}
            <ul className="space-y-4">
              {connections.map((conn) => (
                <li
                  key={conn.id}
                  className="border p-4 rounded flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    {conn.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conn.logoUrl}
                        alt={conn.brokerName}
                        className="w-12 h-12 object-contain"
                      />
                    )}
                    <span className="font-semibold">{conn.brokerName}</span>
                    {conn.disabled && <span className="text-sm text-red-600">(Disabled)</span>}
                  </div>
                  <Link
                    href={`/broker/${conn.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Accounts
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}