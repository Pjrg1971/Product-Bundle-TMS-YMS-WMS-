import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { getChannels, getMessages, sendMessage } from '../api/client';
import type { MessageChannel, Message } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MessagesPage() {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels, loading: channelsLoading } = useApi(getChannels);

  // Auto-select first channel
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannel) {
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannel]);

  const msgFetcher = useCallback(
    () => (activeChannel ? getMessages(activeChannel) : Promise.resolve([])),
    [activeChannel],
  );
  const { data: messages, refetch: refetchMessages } = usePolling<Message[]>(msgFetcher, 10000);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!activeChannel || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(activeChannel, { text: text.trim(), sender: 'Yard Ops', incoming: false });
      setText('');
      refetchMessages();
    } catch {
      // error
    } finally {
      setSending(false);
    }
  };

  if (channelsLoading) return <LoadingSpinner />;

  const channelList = channels ?? [];

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-0 -m-6">
      {/* Channel List */}
      <div className="w-[280px] shrink-0 bg-cl-dark border-r border-cl-panel flex flex-col">
        <div className="px-5 py-4 border-b border-cl-panel">
          <h2 className="text-sm font-semibold text-cl-text uppercase tracking-wide">Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {channelList.map((ch: MessageChannel) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                activeChannel === ch.id
                  ? 'bg-cl-accent/10 text-cl-accent border-r-2 border-cl-accent'
                  : 'text-cl-text-secondary hover:bg-white/[0.04] hover:text-cl-text'
              }`}
            >
              <span className="text-lg">{ch.icon ?? '#'}</span>
              <span className="text-sm font-medium">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-cl-navy">
        {/* Channel Header */}
        {activeChannel && (
          <div className="px-6 py-4 border-b border-cl-panel bg-cl-dark/50">
            <h3 className="text-sm font-semibold text-cl-text">
              {channelList.find((c) => c.id === activeChannel)?.name ?? 'Channel'}
            </h3>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {(messages ?? []).map((msg: Message) => (
            <div key={msg.id} className={`flex ${msg.incoming ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                  msg.incoming ? 'bg-cl-panel text-cl-text' : 'bg-cl-accent text-white'
                }`}
              >
                <p className="text-xs font-medium opacity-70 mb-0.5">{msg.sender}</p>
                <p className="text-sm">{msg.text}</p>
                <p className="text-[10px] opacity-50 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {(!messages || messages.length === 0) && (
            <p className="text-center text-cl-muted text-sm py-12">No messages yet. Start the conversation.</p>
          )}
        </div>

        {/* Input Bar */}
        {activeChannel && (
          <div className="px-6 py-4 border-t border-cl-panel bg-cl-dark/50">
            <div className="flex gap-3">
              <input
                className="flex-1 bg-cl-navy border border-cl-panel rounded-lg px-4 py-2.5 text-sm text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="bg-cl-accent text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-cl-accent/90 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
