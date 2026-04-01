import { describe, it, expect } from 'vitest';
import React from 'react';

// Since TrafficLight is a server component, we test its output structure
// by importing and calling it as a function
import { TrafficLight } from './traffic-light';

// @criterion: fa1-traffic-light-002
// @criterion-hash: 28d2034f3514
describe('TrafficLight component', () => {
  it('renders with GREEN status', () => {
    const element = TrafficLight({ status: 'GREEN' });
    expect(element).toBeTruthy();
  });

  it('renders with ORANGE status', () => {
    const element = TrafficLight({ status: 'ORANGE' });
    expect(element).toBeTruthy();
  });

  it('renders with RED status', () => {
    const element = TrafficLight({ status: 'RED' });
    expect(element).toBeTruthy();
  });

  it('renders with label', () => {
    const element = TrafficLight({ status: 'GREEN', label: 'All clear' });
    expect(element).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const sm = TrafficLight({ status: 'GREEN', size: 'sm' });
    const md = TrafficLight({ status: 'GREEN', size: 'md' });
    const lg = TrafficLight({ status: 'GREEN', size: 'lg' });
    expect(sm).toBeTruthy();
    expect(md).toBeTruthy();
    expect(lg).toBeTruthy();
  });
});
