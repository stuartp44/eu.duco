import { SimpleClass } from 'homey';
import fetch, { Response } from 'node-fetch';
import * as IpAddress from 'ip-address';

interface DucoNodeList {
  nodelist: number[];
}

interface DucoNodeInfo {
  node: number;
  devtype: string;
  subtype: number;
  netw: string;
  addr: number;
  sub: number;
  prnt: number;
  asso: number;
  location: string;
  state: string;
  cntdwn: number;
  endtime: number;
  mode: string;
  trgt: number;
  actl: number;
  ovrl: number;
  snsr: number;
  cerr: number;
  swversion: string;
  serialnb: string;
  temp: number;
  co2: number;
  rh: number;
  error: string;
  show: number;
  link: number;
}

interface DucoBoardInfo {
  serial: string;
  uptime: number;
  swversion: string;
  mac: string;
  ip: string;
}

interface DucoNodeState {
  state: "MAN1" | "MAN2" | "MAN3" | "AUTO"
}

interface DucoSetStates {
  state: "FAILED" | "SUCCESS";
}

export var ipv4 = IpAddress.Address4;

export default class duco {
  logger: SimpleClass;

  constructor(logger: SimpleClass) {
    this.logger = logger;
  }

  async fetchDataFromDevice (endpoint: string, ip_address: string): Promise<object> {
    let url = `http://${ip_address}/${endpoint}`;

    try {
      this.logger.log(`GET ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
      for await (const chunk of response.body) {
        // Even though the response is JSON, the API returns a string with the value "FAILED" or "SUCCESS"
        var stringResponse = chunk.toString();
        try {
          var parsedResponse = JSON.parse(stringResponse);
          return parsedResponse;
        } catch (error) {
          var status_object: DucoSetStates = {
            state: stringResponse as typeof status_object.state
          }
          return status_object;
        }
      }
      return response;
    } catch (error) {
      this.logger.error(`Unable to contact Duco System: ${error}`)
      throw error
    }
  }

  async setNodeState (node: number, state: DucoNodeState, ip_address: string): Promise<DucoSetStates> {
    try {
      this.logger.log(`SET NODE ${node} on ${ip_address} to ${state}`);
      const data: DucoSetStates = await this.fetchDataFromDevice(`nodesetoperstate?node=${node}&value=${state}`, ip_address) as DucoSetStates;
      return data;
    } catch (error) {
      this.logger.error(`Unable to determin node information: ${error}`);
      throw error;
    }
  }

  async getNodeInformation (node: number, ip_address: string): Promise<DucoNodeInfo> {
    try {
      this.logger.log(`QUERY NODE ${node} on ${ip_address}`);
      const data: DucoNodeInfo = await this.fetchDataFromDevice(`nodeinfoget?node=${node}`, ip_address) as DucoNodeInfo;
      return data;
    } catch (error) {
      this.logger.error(`Unable to determin node information: ${error}`);
      throw error;
    }
  }

  async getNodes (ip_address: string): Promise<DucoNodeList> {
    try {
      this.logger.log(`QUERYCONTROLLER ${ip_address}`);
      const data: DucoNodeList = await this.fetchDataFromDevice('nodelist', ip_address) as DucoNodeList;
      this.logger.log(data);
      return data;
    } catch (error) {
      this.logger.error(`Unable to determin nodelist: ${error}`);
      throw error;
    }
  }

  async getCapabilities (devtype: string): Promise<string[]> {
    switch (devtype) {
      case 'BOX':
        return ['duco_duty_state_capability', 'duco_fan_state_capability'];
      case 'VLVRH':
        return ['duco_duty_state_capability', 'duco_damper_state_capability', 'measure_temperature', 'measure_humidity'];
      case 'UCCO2':
        return ['measure_temperature', 'measure_co2'];
      default:
        return [];
    }
  }

  async capbilityToValueMapper (capability: string) {
    switch (capability) {
      case 'duco_duty_state_capability':
        return 'state';
      case 'duco_fan_state_capability':
        return 'actl';
      case 'duco_damper_state_capability':
        return 'actl';
      case 'measure_temperature':
        return 'temp';
      case 'measure_humidity':
        return 'rh';
      case 'measure_co2':
        return 'co2';
      default:
        return '';
    }
  }

  async requiresListener (capability: string): Promise<boolean> {
    switch (capability) {
      case 'duco_duty_state_capability':
        return true;
      default:
        return false;
    }
  }
}