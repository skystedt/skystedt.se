export type CommunicationDataSend = {
  x: number;
  y: number;
};

export type CommunicationData =
  | CommunicationDataInit
  | CommunicationDataConnect
  | CommunicationDataDisconnect
  | CommunicationDataUpdate;

export type CommunicationDataInit = {
  type: MessageType.Init;
  ids: string[];
};

export type CommunicationDataConnect = {
  type: MessageType.Connect;
  id: string;
};

export type CommunicationDataDisconnect = {
  type: MessageType.Disconnect;
  id: string;
};

export type CommunicationDataUpdate = {
  type: MessageType.Update;
  id: string;
  x: number;
  y: number;
};
