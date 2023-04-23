import Homey from 'homey';
import duco from '../../lib/duco';

const RETRY_INTERVAL = 45 * 1000

class DucoDevice extends Homey.Device {
  private duco: duco = new duco(this);
 
  timer!: NodeJS.Timer
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('DucoDevice has been initialized');
    const settings = this.getSettings();
    const data = this.getData();
    const store = this.getStore();
    const deviceCapabilities = this.getCapabilities();

    for (const capability in deviceCapabilities) {
      const requiresListener = await this.duco.requiresListener(deviceCapabilities[capability])
      if (requiresListener === true) {
        try {
          this.registerCapabilityListener(deviceCapabilities[capability], async (value) => {
            this.log(`registerCapabilityListener: ${capability} - ${value}`)
            var returnedState = await this.duco.setNodeState(data.node, value, store.accessible_by)
            if (returnedState.state === 'SUCCESS') {
              await this.setCapabilityValue(deviceCapabilities[capability], value).catch(this.error);
            }
          });
          this.homey.flow.getActionCard('set_operational_state').registerRunListener(async (args, state) => {
              return await this.triggerCapabilityListener(deviceCapabilities[capability], args.state).catch(this.error);
          });
        } catch (error) {
          this.error(error)
        }
      }
    }

    try {
      this.pollNode(data.node, store.accessible_by)

    } catch (error) {
      this.error(error)
    }

    this.timer = setInterval(async () => {
      this.pollNode(data.node, store.accessible_by)
    }, RETRY_INTERVAL)
  }

  async pollNode (node: number, ip_address: string) {
    try {
      const currentNodeValues = await this.duco.getNodeInformation(node, ip_address)
      const capabilitiesToUpdate = await this.duco.getCapabilities(currentNodeValues.devtype)
      for (const capability in capabilitiesToUpdate) {
        const mappedToValue = await this.duco.capbilityToValueMapper(capabilitiesToUpdate[capability]) as keyof typeof currentNodeValues
        this.setCapabilityValue(capabilitiesToUpdate[capability], currentNodeValues[mappedToValue])
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
  async onAdded() {
    this.log('DucoDevice has been added');
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
  async onRenamed(name: string) {
    this.log('DucoDevice was renamed');
    this.duco.setNodeSettingsValue(this.getData().node, 'Location', name, this.getStore().accessible_by)
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('DucoDevice has been deleted');
  }

}

module.exports = DucoDevice;
