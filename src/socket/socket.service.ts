import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/service/prisama.service';

@Injectable()
export class SocketService {

  readonly connectedClients: Map<string, Socket> = new Map();
  private readonly connectedUsers: Map<string, string> = new Map();
  constructor(private prismaService: PrismaService) { }



  handleConnection(socket: Socket): void {
    console.log('New connection', socket.id);
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);
    socket.on('add-user', async (userId: string) => {
      console.log('User joined', userId);
      this.connectedUsers.set(userId, clientId);
      console.log('User joined', this.connectedUsers);
    });



    socket.on("get-users-list", async ({ currentUser }) => {
      console.log('Get users list');
      //   const ids: string[] = Array.from(this.connectedClients.keys());

      // console.log('Connected clients', ids);
      console.log('Connected users', this.connectedUsers.keys());
      // console.log("ids", ids);
      console.log('Current user', currentUser);
      const ids: string[] = Array.from(this.connectedUsers.keys()).map((key) => key);
      console.log('Connected usersssssssss', ids);

      const users = await this.prismaService.user.findMany({
        where: {
          NOT: {
            id: currentUser
          }
        }
      });

      const usersList = users.map((user) => {
        return {
          id: user.id,
          username: user.name,
          email: user.email,
          status: ids.includes(user.id) ? 'online' : 'offline'
          ,
        };
      }
      );
      socket.emit("users-list", { users: usersList });

    });


    socket.on('get-messages', async ({ senderId, receiverId }) => {
      console.log('Get messages', senderId, receiverId);
      const messages = await this.prismaService.message.findMany({
        where: {
          OR: [
            {
              senderId: senderId,
              receiverId: receiverId
            },
            {
              senderId: receiverId,
              receiverId: senderId
            }
          ]
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      socket.emit('messages', messages);
    });

    socket.on('get-messages', async ({ senderId, receiverId }) => {
      console.log('Get messages', senderId, receiverId);
      const messages = await this.prismaService.message.findMany({
        where: {
          OR: [
            {
              senderId: senderId,
              receiverId: receiverId
            },
            {
              senderId: receiverId,
              receiverId: senderId
            }
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


    });


    socket.on('disconnect', () => {
      console.log('User disconnected', clientId);
      this.connectedClients.delete(clientId);
      this.connectedUsers.forEach((value, key) => {
        if (value === clientId) {
          this.connectedUsers.delete(key);
        }
      });
      console.log('User disconnected', this.connectedUsers);
    });

    // socket.on('disconnect', () => {
    //   this.connectedClients.delete(clientId);
    // });

  }

  getUserIdsBySocketId(socketId: string): string[] {
    const userIds: string[] = [];
    this.connectedUsers.forEach((value, key) => {
      if (value === socketId) {
        userIds.push(key);
      }
    });
    return userIds;
  }

}