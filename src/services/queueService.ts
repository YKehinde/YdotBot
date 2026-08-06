export interface QueueMember {
  username: string;
  userId: string;
  joinedAt: Date;
}

interface ChannelQueue {
  members: QueueMember[];
  locked: boolean;
}

const queues = new Map<string, ChannelQueue>();

function getOrCreateQueue(channelName: string): ChannelQueue {
  if (!queues.has(channelName)) {
    queues.set(channelName, { members: [], locked: false });
  }
  return queues.get(channelName)!;
}

export const queueService = {
  join(channelName: string, username: string, userId: string): boolean {
    const queue = getOrCreateQueue(channelName);

    if (queue.locked) {
      return false;
    }

    if (queue.members.some((m) => m.userId === userId)) {
      return false;
    }

    queue.members.push({
      username,
      userId,
      joinedAt: new Date(),
    });

    return true;
  },

  leave(channelName: string, userId: string): boolean {
    const queue = getOrCreateQueue(channelName);
    const index = queue.members.findIndex((m) => m.userId === userId);

    if (index === -1) {
      return false;
    }

    queue.members.splice(index, 1);
    return true;
  },

  next(channelName: string): QueueMember | null {
    const queue = getOrCreateQueue(channelName);
    return queue.members.shift() || null;
  },

  getQueue(channelName: string): QueueMember[] {
    const queue = getOrCreateQueue(channelName);
    return [...queue.members];
  },

  remove(channelName: string, userId: string): boolean {
    const queue = getOrCreateQueue(channelName);
    const index = queue.members.findIndex((m) => m.userId === userId);

    if (index === -1) {
      return false;
    }

    queue.members.splice(index, 1);
    return true;
  },

  clear(channelName: string) {
    const queue = getOrCreateQueue(channelName);
    queue.members = [];
  },

  lock(channelName: string) {
    const queue = getOrCreateQueue(channelName);
    queue.locked = true;
  },

  unlock(channelName: string) {
    const queue = getOrCreateQueue(channelName);
    queue.locked = false;
  },

  isLocked(channelName: string): boolean {
    const queue = getOrCreateQueue(channelName);
    return queue.locked;
  },

  getSize(channelName: string): number {
    const queue = getOrCreateQueue(channelName);
    return queue.members.length;
  },
};
