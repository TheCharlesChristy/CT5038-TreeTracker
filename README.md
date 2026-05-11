# TreeGuardians

TreeGuardians is an Expo app and Node/MySQL backend for mapping, recording, and managing trees in the Charlton Kings boundary.

## Quick Start

Prerequisites: Docker with Compose, Linux KVM access for the Android emulator, and Node 20.20.1 for host-side package work.

```bash
./scripts/local_plesk_stack.sh
```

The launcher starts MySQL, the Node backend, the Expo web exporter, the Expo dev server, and a noVNC Android emulator.

Default local URLs:

- Web app and backend: `http://localhost:4000/`
- Expo dev server: `http://localhost:8081/`
- Android emulator noVNC: `http://localhost:6080/vnc.html`

Run backend tests:

```bash
npm test --prefix server
```

## Further Docs

- Local Docker stack: [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)
- Backend API and configuration: [server/README.md](server/README.md)
- Expo app: [TreeGuardiansExpo/README.md](TreeGuardiansExpo/README.md)
- Plesk deployment: [PLESK.md](PLESK.md)
- Expo components: [TreeGuardiansExpo/components/README.md](TreeGuardiansExpo/components/README.md)
- Style tokens: [TreeGuardiansExpo/styles/README.md](TreeGuardiansExpo/styles/README.md)
- Tree species dataset: [TreeGuardiansExpo/docs/tree-species-dataset.md](TreeGuardiansExpo/docs/tree-species-dataset.md)
