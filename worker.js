import { schnorr } from "@noble/curves/secp256k1";

// Relay info (NIP-11)
const relayInfo = {
    name: "verified-nostr",
    description: "A premium Nostr relay from Verified-Nostr.com powered by Nosflare",
    pubkey: "d49a9023a21dba1b3c8306ca369bf3243d8b44b8f0b6d1196607f7b0990fa8df",
    contact: "support@verified-nostr.com",
    supported_nips: [1, 2, 4, 9, 11, 12, 15, 16, 20, 22, 33, 40],
    software: "https://github.com/Spl0itable/nosflare",
    version: "1.12.9",
};

// Relay favicon
const relayIcon = "https://verified-nostr.com/assets/favicon.png";

// Blocked pubkeys
// Add pubkeys in hex format as strings to block write access
const blockedPubkeys = [

];
// Allowed pubkeys handled by list

// Blocked event kinds
// Add comma-separated kinds Ex: 1064, 4, 22242
const blockedEventKinds = new Set([
    1064
]);
// Allowed event kinds
// Add comma-separated kinds Ex: 1, 2, 3
const allowedEventKinds = new Set([
    // ... kinds that are explicitly allowed
]);
function isEventKindAllowed(kind) {
    if (allowedEventKinds.size > 0 && !allowedEventKinds.has(kind)) {
        return false;
    }
    return !blockedEventKinds.has(kind);
}

// Path to trigger the update of allowed pubkeys
const WHITELIST_URL = 'https://verified-nostr.com/whitelist.txt';
const ALLOWED_PUBKEYS_KEY = 'allowedPubkeys';

addEventListener('scheduled', event => {
    event.waitUntil(
        Promise.all([
            cleanUpExpiredCacheEntries(),
            handleScheduledEvent(event)
        ])
    );
});

async function handleScheduledEvent(event) {
    try {
        // Directly call the function to update the allowed pubkeys
        const updateResult = await updateAllowedPubkeys();

        // Get the response body text which contains the outcome message
        const responseBody = await updateResult.text();
        console.log(`Checking pubkey whitelist: ${responseBody}`);
    } catch (error) {
        // Handle any errors that occur during the update
        console.error('Error during whitelist update:', error);
    }
}

// Function to update the allowed pubkeys from the whitelist
async function updateAllowedPubkeys() {
    try {
        // Fetch the whitelist
        const response = await fetch(WHITELIST_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch whitelist: ${response.status}`);
        }
        // Parse the new list of allowed pubkeys
        const whitelistText = await response.text();
        const newAllowedPubkeys = whitelistText.trim().split('\n').map(line => line.replace(/[",]/g, '').trim());

        // Fetch the current list of allowed pubkeys from the KV store
        const currentAllowedPubkeysJSON = await saveAllowedPubkeys.get(ALLOWED_PUBKEYS_KEY);
        const currentAllowedPubkeys = currentAllowedPubkeysJSON ? JSON.parse(currentAllowedPubkeysJSON) : [];

        // Check if the lists are different (either by length or content)
        const listsAreDifferent = (currentAllowedPubkeys.length !== newAllowedPubkeys.length) ||
            (currentAllowedPubkeys.some(pk => !newAllowedPubkeys.includes(pk)) ||
                newAllowedPubkeys.some(pk => !currentAllowedPubkeys.includes(pk)));

        // If the lists are different, update the KV store with the new list
        if (listsAreDifferent) {
            await saveAllowedPubkeys.put(ALLOWED_PUBKEYS_KEY, JSON.stringify(newAllowedPubkeys));
        }

        // Respond to indicate whether the list was updated or not
        return new Response(listsAreDifferent ? "Whitelist updated successfully." : "Whitelist is unchanged.", { status: 200 });
    } catch (error) {
        // Handle any errors that occur during the fetch or KV store update
        return new Response(error.message, { status: 500 });
    }
}

// Function to check if a pubkey is allowed
async function isPubkeyAllowed(pubkey) {
    const allowedPubkeysJSON = await saveAllowedPubkeys.get(ALLOWED_PUBKEYS_KEY);
    const allowedPubkeys = allowedPubkeysJSON ? JSON.parse(allowedPubkeysJSON) : [];
    return allowedPubkeys.includes(pubkey);
}

addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (url.pathname === "/") {
      if (request.headers.get("Upgrade") === "websocket") {
        event.respondWith(handleWebSocket(request));
      } else if (request.headers.get("Accept") === "application/nostr+json") {
        event.respondWith(handleRelayInfoRequest());
      } else {
        event.respondWith(
          new Response("Connect using a Nostr client", { status: 200 })
        );
      }
    } else if (url.pathname === "/favicon.ico") {
      event.respondWith(serveFavicon(event));
    } else {
      event.respondWith(new Response("Invalid request", { status: 400 }));
    }
  });
  async function handleRelayInfoRequest() {
    const headers = new Headers({
      "Content-Type": "application/nostr+json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "GET",
    });
    return new Response(JSON.stringify(relayInfo), { status: 200, headers: headers });
  }
  async function serveFavicon() {
    const response = await fetch(relayIcon);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "max-age=3600");
      return new Response(response.body, {
        status: response.status,
        headers: headers,
      });
    }
    return new Response(null, { status: 404 });
  }
  
  // Rate-limit messages
  class RateLimiter {
    constructor(rate, capacity) {
      this.tokens = capacity;
      this.lastRefillTime = Date.now();
      this.capacity = capacity;
      this.fillRate = rate; // tokens per millisecond
    }
    removeToken() {
      this.refill();
      if (this.tokens < 1) {
        return false; // no tokens available, rate limit exceeded
      }
      this.tokens -= 1;
      return true;
    }
    refill() {
      const now = Date.now();
      const tokensToAdd = ((now - this.lastRefillTime) * this.fillRate);
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }
  const messageRateLimiter = new RateLimiter(100 / 1000, 200);
  
  // Handle event requests (NIP-01)
  async function handleWebSocket(event, request) {
    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();
    server.addEventListener("message", async (messageEvent) => {
      event.waitUntil(
        (async () => {
          try {
            if (!messageRateLimiter.removeToken()) {
              sendError(server, "Rate limit exceeded. Please try again later.");
              return;
            }
            const message = JSON.parse(messageEvent.data);
            const messageType = message[0];
            switch (messageType) {
              case "EVENT":
                await processEvent(message[1], server);
                break;
              case "REQ":
                await processReq(message, server);
                break;
              case "CLOSE":
                await closeSubscription(message[1], server);
                break;
              // Add more cases
            }
          } catch (e) {
            sendError(server, "Failed to process the message");
            console.error("Failed to process message:", e);
          }
        })()
      );
    });
    server.addEventListener("close", (event) => {
      console.log("WebSocket closed", event.code, event.reason);
    });
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
  
  // Handles EVENT messages
  async function processEvent(event, server) {
    try {
      // Check if the pubkey is allowed
      if (!await isPubkeyAllowed(event.pubkey)) {
        sendOK(server, event.id, false, "This pubkey is not allowed.");
        return;
      }
      // Check if the event kind is allowed
      if (!isEventKindAllowed(event.kind)) {
        sendOK(server, event.id, false, `Event kind ${event.kind} is not allowed.`);
        return;
      }
      // Special handling for deletion events (kind 5)
      if (event.kind === 5) {
        await processDeletionEvent(event, server);
        return;
      }
      const eventKey = `event:${event.id}`;
      // Event not found in KV store, retrieve from KV store using event ID
      const existingEvent = await relayDb.get(eventKey, "json");
      if (existingEvent) {
        // Event already exists, drop the duplicate
        sendOK(server, event.id, false, "Duplicate. Event dropped.");
        return;
      }
      const isValidSignature = await verifyEventSignature(event);
      if (isValidSignature) {
        // Get the current event count
        const eventCountKey = "event_count";
        let eventCount = await relayDb.get(eventCountKey, { type: "text" });
        eventCount = parseInt(eventCount || "0");
        // Increment the event count and store the event with the incremented count
        const newEventCount = eventCount + 1;
        const eventKey = `event:${newEventCount}`;
        await relayDb.put(eventKey, JSON.stringify(event));
        await relayDb.put(eventCountKey, newEventCount.toString());
        // Store the event in KV store using event ID
        await relayDb.put(eventKey, JSON.stringify(event));
        sendOK(server, event.id, true, "");
      } else {
        sendOK(server, event.id, false, "Invalid: signature verification failed.");
      }
    } catch (error) {
      console.error("Error in EVENT processing:", error);
      sendOK(server, event.id, false, `Error: EVENT processing failed - ${error.message}`);
    }
  }
  
  // Handles REQ messages
  async function processReq(message, server) {
    const subscriptionId = message[1];
    const filters = message[2] || {};
    let events = [];
  
    const maxEvents = 1000;
    const eventCountKey = "event_count";
    let eventCount = await relayDb.get(eventCountKey, { type: "text" });
    eventCount = parseInt(eventCount || "0");
  
    let fetchedEvents = 0;
    for (let i = 1; i <= eventCount && fetchedEvents < maxEvents; i++) {
      const eventKey = `event:${i}`;
      try {
        const eventValue = await relayDb.get(eventKey, { type: "text" });
        if (eventValue) {
          const event = JSON.parse(eventValue);
          if (isEventMatchingFilters(event, filters)) {
            events.push(event);
            fetchedEvents++;
          }
        }
      } catch (error) {
        console.error(`Error retrieving event ${eventKey}:`, error);
      }
    }
  
    if (filters.limit && events.length > filters.limit) {
      events = events.slice(0, filters.limit);
    }
  
    for (const event of events) {
      server.send(JSON.stringify(["EVENT", subscriptionId, event]));
    }
    server.send(JSON.stringify(["EOSE", subscriptionId]));
  }
  
  function isEventMatchingFilters(event, filters) {
    if (filters.kinds && !filters.kinds.includes(event.kind)) {
      return false;
    }
    if (filters.authors && !filters.authors.includes(event.pubkey)) {
      return false;
    }
    if (filters['#e'] && !event.tags.some(tag => tag[0] === 'e' && filters['#e'].includes(tag[1]))) {
      return false;
    }
    if (filters['#p'] && !event.tags.some(tag => tag[0] === 'p' && filters['#p'].includes(tag[1]))) {
      return false;
    }
    if (filters.since && event.created_at < filters.since) {
      return false;
    }
    if (filters.until && event.created_at > filters.until) {
      return false;
    }
    return true;
  }
  
  // Handles CLOSE messages
  async function closeSubscription(subscriptionId, server) {
    try {
      server.send(JSON.stringify(["CLOSED", subscriptionId, "Subscription closed"]));
    } catch (error) {
      console.error("Error closing subscription:", error);
      sendError(server, `error: failed to close subscription ${subscriptionId}`);
    }
  }
  
  // Handles event deletes (NIP-09)
  // Handles event deletes (NIP-09)
  async function processDeletionEvent(deletionEvent, server) {
    try {
      if (deletionEvent.kind === 5 && deletionEvent.pubkey) {
        const deletedEventIds = deletionEvent.tags
          .filter((tag) => tag[0] === "e")
          .map((tag) => tag[1]);
        const maxDeletedEvents = 50;
        const limitedDeletedEventIds = deletedEventIds.slice(0, maxDeletedEvents);
        const deletePromises = limitedDeletedEventIds.map(async (eventId) => {
          const eventKey = `event:${eventId}`;
          const event = await relayDb.get(eventKey, "json");
          if (event && event.pubkey === deletionEvent.pubkey) {
            // Delete the event entry stored with the event ID
            await relayDb.delete(eventKey);
            
            // Find and delete the event entry stored with the event count
            const eventCountKey = "event_count";
            let eventCount = await relayDb.get(eventCountKey, { type: "text" });
            eventCount = parseInt(eventCount || "0");
            
            for (let i = 1; i <= eventCount; i++) {
              const countEventKey = `event:${i}`;
              const countEvent = await relayDb.get(countEventKey, "json");
              if (countEvent && countEvent.id === eventId) {
                await relayDb.delete(countEventKey);
                break;
              }
            }
            
            return true;
          }
          return false;
        });
        const deleteResults = await Promise.all(deletePromises);
        const deletedCount = deleteResults.filter((result) => result).length;
        if (deletedEventIds.length > maxDeletedEvents) {
          server.send(JSON.stringify(["NOTICE", `Only the first ${maxDeletedEvents} deleted events were processed.`]));
        }
        sendOK(server, deletionEvent.id, true, `Processed deletion request. Events deleted: ${deletedCount}`);
      } else {
        sendOK(server, deletionEvent.id, false, "Invalid deletion event.");
      }
    } catch (error) {
      console.error("Error processing deletion event:", error);
      sendOK(server, deletionEvent.id, false, `Error processing deletion event: ${error.message}`);
    }
  }
  
  function sendOK(server, eventId, status, message) {
    server.send(JSON.stringify(["OK", eventId, status, message]));
  }
  
  function sendError(server, message) {
    server.send(JSON.stringify(["NOTICE", message]));
  }
  
  // Verify event sig
  async function verifyEventSignature(event) {
    try {
      const signatureBytes = hexToBytes(event.sig);
      const serializedEventData = serializeEventForSigning(event);
      const messageHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(serializedEventData)
      );
      const messageHash = new Uint8Array(messageHashBuffer);
      const publicKeyBytes = hexToBytes(event.pubkey);
      const signatureIsValid = schnorr.verify(signatureBytes, messageHash, publicKeyBytes);
      return signatureIsValid;
    } catch (error) {
      console.error("Error verifying event signature:", error);
      return false;
    }
  }
  
  function serializeEventForSigning(event) {
    const serializedEvent = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
    return serializedEvent;
  }
  
  function hexToBytes(hexString) {
    if (hexString.length % 2 !== 0) throw new Error("Invalid hex string");
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
  }