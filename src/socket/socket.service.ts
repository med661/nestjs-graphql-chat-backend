import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/service/prisama.service';

@Injectable()
export class SocketService {

  readonly connectedClients: Map<string, Socket> = new Map();
  private readonly connectedUsers: Map<string, string> = new Map();

  constructor(private prismaService: PrismaService) { }

  async handleConnection(socket: Socket): Promise<void> {
    console.log('New connection', socket.id);
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);

    socket.on('add-user', async (userId: string) => {
      console.log('User joined', userId);
      this.connectedUsers.set(userId, clientId);
      console.log('User joined', this.connectedUsers);
      await this.updateUsersList(socket);

    });

    socket.on("get-users-list", async ({ currentUser }) => {
      console.log('Get users list');
      await this.updateUsersList(socket);
    });

    socket.on('get-messages', async ({ senderId, receiverId }) => {
      console.log('Get messages', senderId, receiverId);
      const messages = await this.prismaService.message.findMany({
        where: {
          OR: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId }
          ]
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      socket.emit('messages', messages);
    });

    socket.on('send-message', async ({ message, senderId, receiverId }) => {
      console.log('Message received', message);

      const createdMessage = await this.prismaService.message.create({
        data: {
          content: message,
          senderId,
          receiverId
        }
      });

      console.log('Message created', createdMessage);
      console.log('Receiver id', receiverId);
      const receiverClientId = this.connectedUsers.get(receiverId);
      const receiverSocket = this.connectedClients.get(receiverClientId);
      console.log('Receiver client id', receiverClientId);
      const senderClientId = this.connectedUsers.get(senderId);
      const senderSocket = this.connectedClients.get(senderClientId);
      console.log('Sender client id', senderClientId);
      if (senderSocket) {
        console.log('Sending message to sender');
        senderSocket.emit('message', createdMessage);
      }

      if (receiverSocket) {
        console.log('Sending message to receiver');
        receiverSocket.emit('message', createdMessage);
      }

      await this.updateUsersList(socket);
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected', clientId);
      this.connectedClients.delete(clientId);
      this.connectedUsers.forEach((value, key) => {
        if (value === clientId) {
          this.connectedUsers.delete(key);
        }
      });
      console.log('User disconnected', this.connectedUsers);
      await this.updateUsersList(socket);
    });
  }

  private async updateUsersList(socket: Socket): Promise<void> {
    const currentUser = Array.from(this.connectedUsers.keys()).find(key => this.connectedUsers.get(key) === socket.id);
    console.log('Current user', currentUser);

    const userIds = Array.from(this.connectedUsers.keys());
    const users = await this.prismaService.user.findMany({
      where: {
        NOT: {
          id: currentUser
        }
      }
    });

    const usersList = users.map((user) => {
      const status = userIds.includes(user.id) ? 'online' : 'offline';
      return { id: user.id, username: user.name, email: user.email, status };
    });

    const sortedUsers = await this.sortUsersByLastMessage(currentUser, usersList);

    socket.emit("users-list", { users: sortedUsers });
  }

  private async sortUsersByLastMessage(currentUser: string, usersList: any[]): Promise<any[]> {
    const sortedUsers = await Promise.all(usersList.map(async (user) => {
      const lastMessage = await this.prismaService.message.findFirst({
        where: {
          OR: [
            { senderId: currentUser, receiverId: user.id },
            { senderId: user.id, receiverId: currentUser }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      return { ...user, lastMessageTime: lastMessage?.createdAt || null };
    }));

    return sortedUsers.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });
  }
}
