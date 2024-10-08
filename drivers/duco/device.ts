import Homey from 'homey';
import duco from '../../lib/duco';

class DucoDevice extends Homey.Device {
  private duco: duco = new duco(this);
 
  timer!: NodeJS.Timer
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    var poll_interval = this.homey.settings.get('poll_interval');
    if (!poll_interval) {
      poll_interval = 45 * 1000
    }
    else {
      poll_interval = poll_interval * 1000
    }
    const data = this.getData();
    const store = this.getStore();
    const deviceCapabilities = this.getCapabilities();

    for (const capability in deviceCapabilities) {
      const requiresListener = await this.duco.requiresListener(deviceCapabilities[capability])
      if (requiresListener === true) {
        try {
          this.registerCapabilityListener(deviceCapabilities[capability], async (value) => {
            await this.setNodeOperationalState(deviceCapabilities[capability], value).catch(this.error);
          });
        } catch (error) {
          this.error(error)
        }
      }
    }

    this.timer = setInterval(async () => {
      this.pollNode(data.node, store.accessible_by)
    }, poll_interval)

    this.pollNode(data.node, store.accessible_by)
    this.log(`${store.dev_type} has been initialized`);
  }
  
  async setNodeOperationalState(capability: any, state: any)
  {
    try {
      const data = this.getData();
      const store = this.getStore();
      var returnedState = await this.duco.setNodeState(data.node, state, store.accessible_by)
      if (returnedState.state === 'SUCCESS') {
        await this.setCapabilityValue(capability, state).catch(this.error);
      }
    } catch (error) {
      this.error(error)
    }
  }

  async pollNode (node: number, ip_address: string) {
    try {
      const currentNodeValues = await this.duco.getNodeInformation(node, ip_address)
      const capabilitiesToUpdate = await this.duco.getCapabilities(currentNodeValues.devtype)
      for (const capability in capabilitiesToUpdate) {
        const mappedToValue = await this.duco.capbilityToValueMapper(capabilitiesToUpdate[capability]) as keyof typeof currentNodeValues
        this.setCapabilityValue(capabilitiesToUpdate[capability], currentNodeValues[mappedToValue])
        await this.setAvailable().catch(this.error);
      }
      this.log(currentNodeValues)
    } catch (error) {
      this.setUnavailable('There was an error getting the node information')
      this.error(error)
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    const store = this.getStore();
    const data = this.getData();
    this.log('DucoDevice has been added');
    try {
      this.pollNode(data.node, store.accessible_by)
    } catch (error) {
      this.error(error)
      this.setUnavailable('There was an error getting the node information')
    }
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("DucoDevice settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name: string) {
    try {
      if (name.length > 19) {
        this.duco.setNodeSettingsValue(this.getData().node, 'Location', name.slice(0, 19), this.getStore().accessible_by)
        throw ('Name is too long, it has been truncated to 19 characters')
      } else {
        this.log('DucoDevice was renamed');
        this.duco.setNodeSettingsValue(this.getData().node, 'Location', name, this.getStore().accessible_by)
      }
    } catch (error) {
      this.error(error)
    }


  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('DucoDevice has been deleted');
  }

}

module.exports = DucoDevice;
