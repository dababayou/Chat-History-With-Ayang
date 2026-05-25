export interface Message {
  id: number;
  dateStr: string; // "MM/DD/YYYY"
  timeStr: string; // "HH:MM"
  sender: 'Chelllkuu' | 'Bynmr' | 'System';
  text: string;
  isSystem: boolean;
  attachment?: {
    type: 'image' | 'video' | 'audio' | 'sticker' | 'media_omitted' | 'other';
    filename: string;
  };
}

export function parseChat(text: string): Message[] {
  const lines = text.split('\n');
  const messages: Message[] = [];
  
  // Regex to match WhatsApp message line header: e.g. "3/16/22, 20:04 - "
  const lineRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}):(\d{2})\s-\s(.*)$/;
  
  let currentMsg: Message | null = null;
  let idCounter = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    
    const trimmedLine = line.trim();
    if (!trimmedLine && !currentMsg) continue;
    
    const match = line.match(lineRegex);
    if (match) {
      // Save the previous message if it exists
      if (currentMsg) {
        messages.push(currentMsg);
      }
      
      const [_, month, day, year, hour, minute, rest] = match;
      
      // Normalize year to 4 digits
      let fullYear = year;
      if (year.length === 2) {
        fullYear = '20' + year;
      }
      
      const dateStr = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${fullYear}`;
      const timeStr = `${hour.padStart(2, '0')}:${minute}`;
      
      // Determine if there is a sender
      // The sender is usually at the start followed by ": "
      // E.g. "Chelllkuu🤍🤍: Shalom" or "Bynmr: Iya 12 karakter"
      const senderMatch = rest.match(/^([^:]+):\s(.*)$/);
      
      if (senderMatch) {
        const [__, senderRaw, msgText] = senderMatch;
        const senderClean = senderRaw.includes('Chelllkuu') ? 'Chelllkuu' : 'Bynmr';
        
        currentMsg = {
          id: idCounter++,
          dateStr,
          timeStr,
          sender: senderClean,
          text: msgText,
          isSystem: false
        };
        
        // Check for attachments in msgText
        if (msgText.includes('<Media omitted>')) {
          currentMsg.attachment = {
            type: 'media_omitted',
            filename: ''
          };
        } else if (msgText.endsWith('(file attached)')) {
          const filename = msgText.replace(' (file attached)', '').trim();
          const fileLower = filename.toLowerCase();
          
          const isSticker = fileLower.endsWith('.webp') || filename.startsWith('STK-');
          const isImage = fileLower.endsWith('.jpg') || fileLower.endsWith('.jpeg') || fileLower.endsWith('.png') || fileLower.endsWith('.gif') || filename.startsWith('IMG-');
          const isVideo = fileLower.endsWith('.mp4') || fileLower.endsWith('.3gp') || fileLower.endsWith('.mov') || filename.startsWith('VID-');
          const isAudio = fileLower.endsWith('.mp3') || fileLower.endsWith('.wav') || fileLower.endsWith('.ogg') || fileLower.endsWith('.m4a') || fileLower.endsWith('.opus') || fileLower.endsWith('.amr') || filename.startsWith('AUD-') || filename.startsWith('PTT-');
          
          let type: 'image' | 'video' | 'audio' | 'sticker' | 'other' = 'other';
          if (isSticker) type = 'sticker';
          else if (isImage) type = 'image';
          else if (isVideo) type = 'video';
          else if (isAudio) type = 'audio';
          
          currentMsg.attachment = {
            type,
            filename
          };
        }
      } else {
        // System message (e.g. Encryption notice or other system notifications)
        currentMsg = {
          id: idCounter++,
          dateStr,
          timeStr,
          sender: 'System',
          text: rest,
          isSystem: true
        };
      }
    } else {
      // Continuation of the previous message (multi-line)
      if (currentMsg) {
        currentMsg.text += '\n' + line;
        
        // Check if this continuation contains attachment markers
        if (line.includes('<Media omitted>')) {
          currentMsg.attachment = {
            type: 'media_omitted',
            filename: ''
          };
        } else if (line.endsWith('(file attached)')) {
          const filename = line.replace(' (file attached)', '').trim();
          const fileLower = filename.toLowerCase();
          
          const isSticker = fileLower.endsWith('.webp') || filename.startsWith('STK-');
          const isImage = fileLower.endsWith('.jpg') || fileLower.endsWith('.jpeg') || fileLower.endsWith('.png') || fileLower.endsWith('.gif') || filename.startsWith('IMG-');
          const isVideo = fileLower.endsWith('.mp4') || fileLower.endsWith('.3gp') || fileLower.endsWith('.mov') || filename.startsWith('VID-');
          const isAudio = fileLower.endsWith('.mp3') || fileLower.endsWith('.wav') || fileLower.endsWith('.ogg') || fileLower.endsWith('.m4a') || fileLower.endsWith('.opus') || fileLower.endsWith('.amr') || filename.startsWith('AUD-') || filename.startsWith('PTT-');
          
          let type: 'image' | 'video' | 'audio' | 'sticker' | 'other' = 'other';
          if (isSticker) type = 'sticker';
          else if (isImage) type = 'image';
          else if (isVideo) type = 'video';
          else if (isAudio) type = 'audio';
          
          currentMsg.attachment = {
            type,
            filename
          };
        }
      } else {
        // Fallback for lines before any message headers
        currentMsg = {
          id: idCounter++,
          dateStr: '03/16/2022',
          timeStr: '20:04',
          sender: 'System',
          text: line,
          isSystem: true
        };
      }
    }
  }
  
  if (currentMsg) {
    messages.push(currentMsg);
  }
  
  return messages;
}
