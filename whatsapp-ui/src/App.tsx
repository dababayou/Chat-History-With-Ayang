import { useState, useEffect, useRef, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { 
  Video, 
  Phone, 
  Search, 
  Calendar as CalendarIcon, 
  MoreVertical, 
  Plus, 
  Smile, 
  Mic, 
  Send, 
  X, 
  ArrowLeft, 
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Smile as StickerIcon,
  ChevronDown
} from 'lucide-react'
import { parseChat } from './utils/chatParser'
import type { Message } from './utils/chatParser'
import ppImage from './assets/pp.png'
import './App.css'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Fetching chat history...')
  
  // Slice state for lazy loading
  const [sliceStart, setSliceStart] = useState(0)
  const [sliceEnd, setSliceEnd] = useState(0)
  const sliceSize = 300 // Number of messages to render at once
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  
  // Highlight / Jump state
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  
  // Input state
  const [inputValue, setInputValue] = useState('')
  const [showCalendarInput, setShowCalendarInput] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false)
  
  const chatFeedRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Store scroll height to maintain scroll position when loading previous messages
  const lastScrollHeightRef = useRef<number>(0)
  const isJumpingRef = useRef<boolean>(false)

  // Fetch and parse the chat log
  useEffect(() => {
    async function loadChat() {
      try {
        setLoadingText('Fetching 10MB chat log...');
        setLoadingProgress(10);
        const response = await fetch('WhatsApp Chat with Chelllkuu.txt');
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat file');
        }
        
        setLoadingText('Parsing 221,000+ messages...');
        setLoadingProgress(40);
        
        const reader = response.body?.getReader();
        const contentLength = +(response.headers.get('Content-Length') || '10218287');
        
        let receivedLength = 0;
        let chunks: Uint8Array[] = [];
        
        if (reader) {
          while(true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            const percent = Math.min(40 + Math.floor((receivedLength / contentLength) * 40), 80);
            setLoadingProgress(percent);
          }
        }
        
        setLoadingText('Parsing text file...');
        setLoadingProgress(85);
        
        // Combine chunks into string
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for(let chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }
        
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(allChunks);
        
        const parsed = parseChat(text);
        setMessages(parsed);
        
        setLoadingProgress(100);
        setLoadingText('Loaded!');
        
        // Setup initial slice to show the latest messages
        const total = parsed.length;
        setSliceStart(Math.max(0, total - sliceSize));
        setSliceEnd(total);
        
        // Short delay to show 100% complete
        setTimeout(() => {
          setIsLoading(false);
        }, 600);
      } catch (err) {
        console.error(err);
        setLoadingText('Error loading chat file. Please verify it is in public/');
      }
    }
    loadChat();
  }, [])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && chatFeedRef.current && !isJumpingRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [isLoading])

  // Scroll event handler for Infinite Scroll Up / Down
  const handleScroll = () => {
    if (!chatFeedRef.current || isJumpingRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatFeedRef.current;
    
    // Near Top (scrolling up) - load previous messages
    if (scrollTop < 80 && sliceStart > 0) {
      // Record current scrollHeight and scrollTop
      lastScrollHeightRef.current = scrollHeight;
      
      const newStart = Math.max(0, sliceStart - 100);
      const newEnd = Math.max(sliceSize, sliceEnd - 100); // keep window size similar
      
      setSliceStart(newStart);
      setSliceEnd(newEnd);
      
      // Adjust scroll position after state updates
      setTimeout(() => {
        if (chatFeedRef.current) {
          const newScrollHeight = chatFeedRef.current.scrollHeight;
          const diff = newScrollHeight - lastScrollHeightRef.current;
          chatFeedRef.current.scrollTop = scrollTop + diff;
        }
      }, 0);
    }
    
    // Near Bottom (scrolling down) - load next messages if not at the very end
    if (scrollHeight - scrollTop - clientHeight < 80 && sliceEnd < messages.length) {
      lastScrollHeightRef.current = scrollHeight;
      
      const newEnd = Math.min(messages.length, sliceEnd + 100);
      const newStart = Math.min(messages.length - sliceSize, sliceStart + 100);
      
      setSliceStart(newStart);
      setSliceEnd(newEnd);
    }

    // Toggle Scroll-to-Bottom button visibility
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    const isAtLatest = sliceEnd === messages.length;
    setShowScrollBottomBtn(!isNearBottom || !isAtLatest);
  };

  // Scroll to absolute latest chat
  const scrollToLatestChat = () => {
    isJumpingRef.current = true;
    
    // Set viewport slice back to the latest messages
    const newStart = Math.max(0, messages.length - sliceSize);
    setSliceStart(newStart);
    setSliceEnd(messages.length);
    
    // Wait for the render to complete and scroll to bottom
    setTimeout(() => {
      if (chatFeedRef.current) {
        chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
      }
      isJumpingRef.current = false;
      setShowScrollBottomBtn(false);
    }, 50);
  };

  // Jump to specific message by absolute index
  const jumpToMessageIndex = (index: number, msgId: number) => {
    isJumpingRef.current = true;
    
    // Create a slice centered around the target index
    const newStart = Math.max(0, index - Math.floor(sliceSize / 2));
    const newEnd = Math.min(messages.length, newStart + sliceSize);
    
    setSliceStart(newStart);
    setSliceEnd(newEnd);
    setHighlightedId(msgId);
    
    // Wait for the render to complete
    setTimeout(() => {
      const targetBubble = document.getElementById(`msg-${msgId}`);
      if (targetBubble && chatFeedRef.current) {
        targetBubble.scrollIntoView({ block: 'center', behavior: 'smooth' });
        
        // Flash animation
        targetBubble.classList.add('bubble-highlight');
        setTimeout(() => {
          targetBubble.classList.remove('bubble-highlight');
          setHighlightedId(null);
          isJumpingRef.current = false;
        }, 2000);
      } else {
        isJumpingRef.current = false;
      }
    }, 100);
  };

  // Search function using full message database (highly optimized, caps at 150 results to prevent DOM crash)
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setHasSearched(true);
    const filtered: Message[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m && !m.isSystem && m.text.toLowerCase().includes(lowerQuery)) {
        filtered.push(m);
        if (filtered.length >= 150) {
          break; // Stop scanning once we have 150 matches to keep search instant and prevent lag!
        }
      }
    }
    setSearchResults(filtered);
  };

  // Jump to Chat on Specific Date
  const handleDateJump = (e: ChangeEvent<HTMLInputElement>) => {
    const rawDate = e.target.value; // YYYY-MM-DD
    if (!rawDate) return;
    
    setSelectedDate(rawDate);
    setShowCalendarInput(false);
    
    // Convert YYYY-MM-DD to MM/DD/YYYY
    const [year, month, day] = rawDate.split('-');
    const targetDateStr = `${month}/${day}/${year}`;
    
    // Find the first message that matches or is closest to targetDateStr
    let targetIdx = -1;
    
    // Find exact match or first message on or after target date
    const targetTime = new Date(rawDate).getTime();
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue;
      const [mMonth, mDay, mYear] = msg.dateStr.split('/');
      const mDateFormatted = `${mYear}-${mMonth}-${mDay}`;
      const mTime = new Date(mDateFormatted).getTime();
      
      if (msg.dateStr === targetDateStr || mTime >= targetTime) {
        targetIdx = i;
        break;
      }
    }
    
    if (targetIdx !== -1) {
      const targetMsg = messages[targetIdx];
      if (targetMsg) {
        jumpToMessageIndex(targetIdx, targetMsg.id);
      }
    } else {
      // If date is in the future or no messages after, jump to the last message
      jumpToMessageIndex(messages.length - 1, messages[messages.length - 1]?.id || 0);
    }
  };

  // Send message simulation
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    const newMsg: Message = {
      id: messages.length,
      dateStr,
      timeStr,
      sender: 'Chelllkuu', // Outgoing (green, right side)
      text: inputValue,
      isSystem: false
    };
    
    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputValue('');
    
    // Shift window to include the new message
    setSliceEnd(updated.length);
    setSliceStart(Math.max(0, updated.length - sliceSize));
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatFeedRef.current) {
        chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
      }
    }, 50);
  };

  // Render slice of messages
  const visibleMessages = useMemo(() => {
    return messages.slice(sliceStart, sliceEnd);
  }, [messages, sliceStart, sliceEnd]);

  // Group visible messages by date for date headers
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let currentGroup: { date: string; msgs: Message[] } | null = null;
    
    visibleMessages.forEach((msg) => {
      // Parse date to readable form e.g. "04/05/2026"
      const date = msg.dateStr;
      
      if (!currentGroup || currentGroup.date !== date) {
        currentGroup = { date, msgs: [] };
        groups.push(currentGroup);
      }
      currentGroup.msgs.push(msg);
    });
    
    return groups;
  }, [visibleMessages]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-logo-box">
          <div className="wa-logo">
            <svg viewBox="0 0 24 24" width="60" height="60" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.774-4.366 9.777-9.768.002-2.617-1.015-5.079-2.863-6.93-1.847-1.85-4.303-2.87-6.924-2.872-5.407 0-9.777 4.367-9.78 9.77-.002 1.702.459 3.361 1.334 4.805L1.766 22.25l4.881-1.286zm10.741-6.918c-.28-.14-1.65-.81-1.902-.902-.253-.093-.438-.14-.623.14-.184.278-.713.902-.875 1.088-.162.186-.325.21-.605.07-.28-.14-1.18-.435-2.249-1.389-.831-.741-1.393-1.657-1.556-1.937-.162-.28-.017-.431.122-.571.125-.127.28-.325.42-.488.14-.162.186-.279.28-.464.093-.186.046-.349-.023-.488-.07-.14-.623-1.503-.853-2.062-.224-.54-.45-.466-.622-.475-.162-.007-.346-.009-.53-.009-.184 0-.485.07-.738.349-.253.278-.967.951-.967 2.32 0 1.37.997 2.693 1.136 2.879.14.186 1.962 2.997 4.753 4.2 1.124.484 1.83.69 2.454.886.697.22 1.328.19 1.827.115.556-.084 1.651-.674 1.882-1.324.23-.65.23-1.207.162-1.324-.07-.116-.253-.186-.534-.326z"/>
            </svg>
          </div>
          <h2>WhatsApp</h2>
          <div className="loading-bar">
            <div className="loading-bar-fill" style={{ width: `${loadingProgress}%` }}></div>
          </div>
          <p className="loading-text">{loadingText}</p>
        </div>
        <div className="loading-footer">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.4">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Main Chat Panel */}
      <div className={`chat-panel ${isSearchOpen ? 'search-active' : ''}`}>
        
        {/* Header */}
        <header className="chat-header">
          <div className="header-left">
            <button className="back-btn mobile-only">
              <ArrowLeft size={20} />
            </button>
            <div className="avatar-wrapper">
              {/* Couple profile image from assets */}
              <img src={ppImage} alt="Mas" className="avatar-img" />
            </div>
            <div className="contact-info">
              <h3>Mas 🤍🤍</h3>
              <span className="status-text">last seen today at 12:44</span>
            </div>
          </div>
          
          <div className="header-right">
            <button className="icon-btn" title="Video call">
              <Video size={20} />
            </button>
            <button className="icon-btn" title="Voice call">
              <Phone size={18} />
            </button>
            <span className="divider"></span>
            
            {/* Search Feature Trigger */}
            <button 
              className={`icon-btn ${isSearchOpen ? 'active' : ''}`} 
              title="Search messages"
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 300);
              }}
            >
              <Search size={20} />
            </button>
            
            {/* Calendar Feature Trigger */}
            <div className="calendar-btn-wrapper">
              <button 
                className={`icon-btn ${showCalendarInput ? 'active' : ''}`} 
                title="Jump to date"
                onClick={() => setShowCalendarInput(!showCalendarInput)}
              >
                <CalendarIcon size={20} />
              </button>
              
              {showCalendarInput && (
                <div className="calendar-popover">
                  <label htmlFor="jump-date">Jump to Specific Date</label>
                  <input 
                    type="date" 
                    id="jump-date"
                    value={selectedDate}
                    onChange={handleDateJump}
                    min="2022-03-16"
                    max="2026-05-24"
                    autoFocus
                  />
                  <button className="close-popover" onClick={() => setShowCalendarInput(false)}>Close</button>
                </div>
              )}
            </div>
            
            <button className="icon-btn" title="Menu">
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* Chat Feed Window */}
        <div 
          className="chat-feed chat-feed-bg" 
          ref={chatFeedRef}
          onScroll={handleScroll}
        >
          {sliceStart > 0 && (
            <div className="load-more-indicator">
              <span>Scrolling up loads older messages automatically...</span>
            </div>
          )}
          
          {groupedMessages.map((group) => {
            // Render Date Header nicely, e.g. converting 03/16/2022 to human date
            const dateParts = group.date.split('/');
            const dateObj = new Date(`${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`);
            const formattedDate = isNaN(dateObj.getTime()) ? group.date : dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            
            return (
              <div key={group.date} className="date-group">
                <div className="date-header">
                  <span>{formattedDate}</span>
                </div>
                
                {group.msgs.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} id={`msg-${msg.id}`} className="system-message-row">
                        <div className="system-bubble">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }
                  
                  const isOutgoing = msg.sender === 'Chelllkuu';
                  const isHighlighted = highlightedId === msg.id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      id={`msg-${msg.id}`} 
                      className={`message-row ${isOutgoing ? 'row-outgoing' : 'row-incoming'}`}
                    >
                      <div className={`message-bubble ${isOutgoing ? 'bubble-outgoing' : 'bubble-incoming'} ${isHighlighted ? 'bubble-highlight' : ''}`}>
                        
                        {/* Media omited or attachments */}
                        {msg.attachment ? (
                          <div className="attachment-content">
                            {msg.attachment.type === 'media_omitted' && (
                              <div className="media-omitted-card">
                                <ImageIcon size={20} className="media-icon" />
                                <span>Media Omitted</span>
                              </div>
                            )}
                            {msg.attachment.type === 'image' && (
                              <div className="image-attachment-card">
                                <ImageIcon size={24} className="attachment-icon" />
                                <div className="attachment-meta">
                                  <span className="filename">{msg.attachment.filename}</span>
                                  <span className="filetype">Photo</span>
                                </div>
                              </div>
                            )}
                            {msg.attachment.type === 'sticker' && (
                              <div className="sticker-attachment-card">
                                <StickerIcon size={24} className="sticker-icon" />
                                <div className="attachment-meta">
                                  <span className="filename">{msg.attachment.filename}</span>
                                  <span className="filetype">Sticker</span>
                                </div>
                              </div>
                            )}
                            {msg.attachment.type === 'other' && (
                              <div className="other-attachment-card">
                                <FileText size={24} className="attachment-icon" />
                                <div className="attachment-meta">
                                  <span className="filename">{msg.attachment.filename}</span>
                                  <span className="filetype">Document</span>
                                </div>
                              </div>
                            )}
                            
                            {/* If there's text below attachment, show it */}
                            {msg.text && !msg.text.includes('<Media omitted>') && !msg.text.endsWith('(file attached)') && (
                              <p className="message-text with-meta-spacing">{msg.text}</p>
                            )}
                          </div>
                        ) : (
                          <p className="message-text with-meta-spacing">{msg.text}</p>
                        )}
                        
                        {/* Meta: time and double check tick */}
                        <div className="message-meta">
                          <span className="message-time">{msg.timeStr}</span>
                          {isOutgoing && (
                            <span className="message-receipt">
                              <CheckCheck size={15} color="#53bdeb" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {sliceEnd < messages.length && (
            <div className="load-more-indicator">
              <span>Scrolling down loads newer messages...</span>
            </div>
          )}
        </div>
        
        {/* Floating Scroll to Latest Button */}
        {showScrollBottomBtn && (
          <button 
            className="scroll-bottom-btn" 
            title="Go to latest chat"
            onClick={scrollToLatestChat}
          >
            <ChevronDown size={20} />
          </button>
        )}

        {/* Bottom Input Area */}
        <footer className="chat-footer">
          <button className="icon-btn" title="Emojis">
            <Smile size={22} />
          </button>
          
          <button className="icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Plus size={22} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const now = new Date();
                const pad = (n: number) => n.toString().padStart(2, '0');
                const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;
                const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                
                const newMsg: Message = {
                  id: messages.length,
                  dateStr,
                  timeStr,
                  sender: 'Chelllkuu',
                  text: `${file.name} (file attached)`,
                  isSystem: false,
                  attachment: {
                    type: file.type.startsWith('image/') ? 'image' : 'other',
                    filename: file.name
                  }
                };
                
                const updated = [...messages, newMsg];
                setMessages(updated);
                setSliceEnd(updated.length);
                setSliceStart(Math.max(0, updated.length - sliceSize));
                setTimeout(() => {
                  if (chatFeedRef.current) {
                    chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
                  }
                }, 50);
              }
            }} 
          />
          
          <form className="input-form" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Type a message" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" style={{ display: 'none' }} />
          </form>
          
          {inputValue.trim() ? (
            <button className="icon-btn active" title="Send message" onClick={handleSendMessage}>
              <Send size={22} />
            </button>
          ) : (
            <button className="icon-btn" title="Record voice note">
              <Mic size={22} />
            </button>
          )}
        </footer>
      </div>

      {/* Sliding Search Sidebar */}
      <div className={`search-sidebar ${isSearchOpen ? 'open' : ''}`}>
        <header className="sidebar-header">
          <button className="icon-btn close-sidebar-btn" onClick={() => setIsSearchOpen(false)}>
            <X size={20} />
          </button>
          <h4>Search Messages</h4>
        </header>
        
        <div className="sidebar-search-box">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={handleSearch}
              ref={searchInputRef}
            />
            {searchQuery && (
              <button 
                className="clear-search-btn" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                  searchInputRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="sidebar-content">
          {!hasSearched ? (
            <div className="search-placeholder">
              <p>Search for texts with Mas 🤍🤍 inside this chat history.</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="search-placeholder">
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="search-results-list">
              <div className="results-count">
                {searchResults.length >= 150 
                  ? 'Showing first 150 matches (please narrow search)' 
                  : `Found ${searchResults.length} matches`}
              </div>
              
              {searchResults.map((msg) => {
                const isOutgoing = msg.sender === 'Chelllkuu';
                
                // msg.id represents the exact index of this message in the messages array (O(1) lookup!)
                const globalIndex = msg.id;
                
                // Formatted date
                const dateParts = msg.dateStr.split('/');
                const dateObj = new Date(`${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`);
                const dateFormatted = isNaN(dateObj.getTime()) ? msg.dateStr : dateObj.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                
                return (
                  <button 
                    key={msg.id} 
                    className="search-result-item"
                    onClick={() => jumpToMessageIndex(globalIndex, msg.id)}
                  >
                    <div className="result-item-header">
                      <span className={`sender-tag ${isOutgoing ? 'sender-outgoing' : 'sender-incoming'}`}>
                        {isOutgoing ? 'Chelllkuu' : 'Mas 🤍🤍'}
                      </span>
                      <span className="result-time">{dateFormatted} {msg.timeStr}</span>
                    </div>
                    <p className="result-text">{msg.text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
