import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as mongoose from 'mongoose';
import { handler } from './create';
import Server from '../../models/server.model';
import voiceChannelModel from '../../models/voice-channel.model';

const expect = chai.expect;
chai.use(sinonChai);

describe('websocket voice-channel/create', () => {
  const result = sinon.spy();
  let serverId;
  const sandbox = sinon.createSandbox();
  let io, socket;
  const ioEmit = sandbox.spy();

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

    io = {
      in: () => ({
        emit: ioEmit,
      }),
    };

    socket = {
      handshake: { query: {} },
      claim: {
        user_id: '123456781234567812345678',
      },
      emit: sandbox.spy(),
    };

  });
  afterEach(async () => {
    await Server.remove({});
    await voiceChannelModel.remove({});
    result.resetHistory();
    sandbox.restore();
  });
  it('creates a voice channel and emits channel-list', async () => {
    const emit = sandbox.spy();
    await handler(io, socket, {
      name: 'channel-name',
      server_id: serverId,
    });
    const channel: any = await voiceChannelModel.findOne({}).lean();

    expect(channel).not.to.equal(null);
    expect(channel.name).to.equal('channel-name');
    expect(ioEmit).to.have.been
      .calledWith('channel-list', {
        server_id: serverId,
        channels: [],
        voiceChannels: [{
          _id: channel._id,
          name: 'channel-name',
        }],
      });
  });
  it('channel/create fails if no server_id given', async () => {
    await handler(io, socket, {
      name: 'channel-name',
      server_id: undefined,
    });

    expect(socket.emit).to.have.been
      .calledWith('soft-error', 'Server not found.');
  });
  it('channel/create fails if server.owner_id does not match socket.claim.user_id', async () => {
    socket.claim.user_id = '999996781234567812345678';
    await handler(io, socket, {
      name: 'channel-name',
      server_id: serverId,
    });

    expect(socket.emit).to.have.been
      .calledWith('soft-error', 'You do not have permission to add a channel.');
  });
  it('does not allow two channels to be created with same name', async () => {
    const channel: any = await voiceChannelModel.create({
      name: 'channel-name',
      server_id: serverId,
    });

    const emit = sandbox.spy();
    await handler(io, socket, {
      name: 'channel-name',
      server_id: serverId,
    });

    expect(socket.emit).to.have.been
      .calledWith('soft-error', 'Channel name must be unique.');
  });
  it('emits soft error if channel create fails', async () => {
    sandbox.stub(voiceChannelModel, 'create').callsFake(() => {
      return Promise.reject(new Error('test err'));
    });

    const emit = sandbox.spy();

    try {
      await handler(io, socket, {
        name: 'channel-name',
        server_id: serverId,
      });
      throw new Error('expected createChannel call to fail');
    } catch (e) {
      // tslint:disable-next-line:no-unused-expression
      expect(socket.emit).not.to.have.been.called;
    }
  });
});
