import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface Ticket {
  id: string;
  channelId: string;
  userId: string;
  guildId: string;
  subject: string;
  createdAt: number;
  closedAt?: number;
  isClosed: boolean;
}

const DATA_DIR = './data';
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

function loadTickets(): Map<string, Ticket> {
  try {
    if (!existsSync(TICKETS_FILE)) {
      return new Map();
    }
    const data = readFileSync(TICKETS_FILE, 'utf-8');
    const tickets = JSON.parse(data) as Record<string, Ticket>;
    return new Map(Object.entries(tickets));
  } catch (error) {
    logger.error('TicketService', 'Failed to load tickets', error);
    return new Map();
  }
}

function saveTickets(tickets: Map<string, Ticket>) {
  try {
    const obj = Object.fromEntries(tickets);
    writeFileSync(TICKETS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    logger.error('TicketService', 'Failed to save tickets', error);
  }
}

let tickets = loadTickets();
let ticketCounter = 0;

function generateTicketId(): string {
  ticketCounter += 1;
  return `ticket-${ticketCounter}`;
}

export const ticketService = {
  async init() {
    await ensureDataDir();
    tickets = loadTickets();
    ticketCounter = Math.max(
      ...Array.from(tickets.values()).map((t) => {
        const match = t.id.match(/ticket-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }),
      0
    );
    logger.info('TicketService', `Loaded ${tickets.size} ticket(s)`);
  },

  createTicket(
    channelId: string,
    userId: string,
    guildId: string,
    subject: string
  ): Ticket {
    const ticket: Ticket = {
      id: generateTicketId(),
      channelId,
      userId,
      guildId,
      subject,
      createdAt: Date.now(),
      isClosed: false,
    };

    tickets.set(ticket.id, ticket);
    saveTickets(tickets);

    logger.info('TicketService', `Created ticket ${ticket.id}`);
    return ticket;
  },

  getTicket(ticketId: string): Ticket | null {
    return tickets.get(ticketId) || null;
  },

  getTicketByChannel(channelId: string): Ticket | null {
    for (const ticket of tickets.values()) {
      if (ticket.channelId === channelId) {
        return ticket;
      }
    }
    return null;
  },

  closeTicket(ticketId: string): boolean {
    const ticket = tickets.get(ticketId);
    if (!ticket) {
      return false;
    }

    ticket.isClosed = true;
    ticket.closedAt = Date.now();
    saveTickets(tickets);

    logger.info('TicketService', `Closed ticket ${ticketId}`);
    return true;
  },

  getOpenTickets(guildId: string): Ticket[] {
    return Array.from(tickets.values())
      .filter((t) => t.guildId === guildId && !t.isClosed)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
};
