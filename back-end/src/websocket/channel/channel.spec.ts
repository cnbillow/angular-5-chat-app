import * as chai from 'chai';
import * as mocha from 'mocha';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as mongoose from 'mongoose';
import { createChannel } from './create';
import Channel from '../../models/channel.model';
import Server from '../../models/server.model';

const expect = chai.expect;
chai.use(sinonChai);

const result = sinon.spy();

function createFakeSocketEvent(eventName: string, data: any, user_id: string, complete: any) {
  const socket = {
    claim: {
      user_id,
    },
    on: async (event: string, callback: any) => {
      await callback(data);
      complete();
    },
    emit: result,
  };

  const io = {
    on: (event: string, callback: any) => {
      callback(socket);
    },
  };
  return { io, socket };
}

describe('websocket channel/create', () => {
  let serverId;
  before(async () => {
    await mongoose.connect('mongodb://localhost/myapp-test');
  });
  after(async () => {
    await mongoose.connection.close();
  });
  beforeEach(async () => {
    const server = await Server.create({
      name: 'test-server',
      owner_id: '123456781234567812345678',
    });
    serverId = server._id;
  });
  afterEach(async () => {
    await Server.remove({});
    await Channel.remove({});
    result.resetHistory();
  });
  it('channel/create success', (done) => {
    const { io, socket } = createFakeSocketEvent('create-channel', {
      name: 'channel-name',
      server_id: serverId,
    }, '123456781234567812345678', onComplete);
    createChannel(io);
    function onComplete() {
      expect(result).to.have.been
        .calledWith('channel-list',
        sinon.match({
          server_id: serverId,
          channels: [sinon.match({
            name: 'channel-name',
            server_id: serverId,
          })],
        }));
      done();
    }
  });
  it('channel/create fails if no server_id given', (done) => {
    const { io, socket } = createFakeSocketEvent('create-channel', {
      name: 'channel-name',
    }, '123456781234567812345678', onComplete);
    createChannel(io);
    function onComplete() {
      expect(result).to.have.been
        .calledWith('soft-error', 'Failed to create channel.');
      done();
    }
  });
  it('channel/create fails if server,owner_id does not match socket.claim.user_id', (done) => {
    const { io, socket } = createFakeSocketEvent('create-channel', {
      name: 'channel-name',
      server_id: serverId,
    }, '999956781234567812345678', onComplete);
    createChannel(io);
    function onComplete() {
      expect(result).to.have.been
        .calledWith('soft-error', 'Failed to create channel.');
      done();
    }
  });
});
