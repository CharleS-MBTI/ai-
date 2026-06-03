// components/schedule-card/schedule-card.js
Component({
  properties: {
    schedule: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onTap() {
      this.triggerEvent('select', { id: this.properties.schedule.id });
    },
  },
});
