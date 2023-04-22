import Homey from 'homey';
import duco from '../../lib/duco';


class DucoDriver extends Homey.Driver {
  private duco: duco = new duco(this);
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('DucoDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    const devicesToPresent = [];
    
    for (const k in discoveryResults) {
      const nodes = await this.duco.getNodes(discoveryResults[k].address)
      for (const node in nodes.nodelist) {
        const nodeInfo = await this.duco.getNodeInformation(nodes.nodelist[node], discoveryResults[k].address)
        // UC seems to be some kind of gateway, so we don't want to add it as a device.
        if (nodeInfo && nodeInfo.devtype != 'UC' && nodeInfo.devtype != 'UNKN') {
          const deviceIcon = await this.duco.deviceIcon(nodeInfo.devtype);
          const getCapabilities = await this.duco.getCapabilities(nodeInfo.devtype); 
          
          devicesToPresent.push({
            name: nodeInfo.location,
            data: {
              id: nodeInfo.serialnb,
              node: nodeInfo.node,
            },
            store: {
              dev_type: nodeInfo.devtype,
              sw_version: nodeInfo.swversion,
              accessible_by: discoveryResults[k].address
            },
            settings: {
              dev_type: nodeInfo.devtype,
              sw_version: nodeInfo.swversion,
              accessible_by: discoveryResults[k].address
            },
            icon: deviceIcon,
            capabilities: getCapabilities
          });
        }
      }

    }
    
    return devicesToPresent;
  }

}

module.exports = DucoDriver;
