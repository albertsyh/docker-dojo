// Plain-language definitions for the words used in the exercises.
// Backticks render as inline code. `seenIn` lists exercise ids where the term is put to work.

export type Term = { term: string; aka?: string; text: string; seenIn?: string[] }
export type TermGroup = { id: string; title: string; terms: Term[] }

export const GLOSSARY: TermGroup[] = [
  {
    id: 'basics',
    title: 'The basics',
    terms: [
      { term: 'Docker', text: 'A tool that packages an app with everything it needs to run, so it runs the same on any machine.', seenIn: ['hello-docker'] },
      { term: 'Image', text: 'A read-only template for a container: a filesystem plus settings such as the default command. You build or pull images, then run them.', seenIn: ['hello-docker', 'build-an-image'] },
      { term: 'Container', text: 'A running (or stopped) instance of an image. It is an isolated process with its own filesystem, network and settings. You can run many containers from one image.', seenIn: ['hello-docker', 'first-web-server'] },
      { term: 'Docker Engine', aka: 'daemon, dockerd', text: 'The background service that actually builds images and runs containers. The `docker` command talks to it.', seenIn: ['hello-docker'] },
      { term: 'Docker CLI', aka: 'client', text: 'The `docker` command you type. `docker version` shows both the client and the engine it is talking to.', seenIn: ['hello-docker'] },
      { term: 'Docker Desktop', text: 'An app for macOS and Windows that runs the Docker Engine inside a small Linux virtual machine, plus a GUI.' },
      { term: 'Registry', text: 'A server that stores images so they can be shared. `docker pull` downloads from one and `docker push` uploads to one.' },
      { term: 'Docker Hub', text: 'The default public registry. `nginx`, `alpine` and `hello-world` all come from there.', seenIn: ['hello-docker'] },
      { term: 'Tag', text: 'A label on an image, written after a colon, such as `nginx:alpine` or `my-site:1.0`. If you leave it out, Docker uses `latest`.', seenIn: ['build-an-image'] },
    ],
  },
  {
    id: 'images',
    title: 'Building images',
    terms: [
      { term: 'Dockerfile', text: 'A text file of instructions that describes how to build an image, one step per line.', seenIn: ['build-an-image', 'layer-cache'] },
      { term: 'FROM', text: 'The first Dockerfile instruction. It picks the base image you build on top of.', seenIn: ['build-an-image'] },
      { term: 'COPY', text: 'Copies files from the build context into the image.', seenIn: ['build-an-image', 'layer-cache'] },
      { term: 'RUN', text: 'Runs a command while building, such as installing packages. The result is saved as a new layer.', seenIn: ['layer-cache'] },
      { term: 'CMD', text: 'The default command a container runs when it starts. You can override it on `docker run`.', seenIn: ['layer-cache'] },
      { term: 'ENTRYPOINT', text: 'Like CMD, but harder to override. Often a script that prepares things and then starts the main process.' },
      { term: 'EXPOSE', text: 'Documents which port the app listens on. It does not publish the port: you still need `-p`.', seenIn: ['build-an-image'] },
      { term: 'WORKDIR', text: 'Sets the folder that later instructions (and the container) run in.' },
      { term: 'Base image', text: 'The image named in FROM. Small ones such as `alpine` keep your image small.', seenIn: ['build-an-image'] },
      { term: 'Build context', text: 'The folder you pass to `docker build` (the `.` at the end). Only files inside it can be copied into the image.', seenIn: ['build-an-image'] },
      { term: '.dockerignore', text: 'Lists files to leave out of the build context, such as `node_modules` or `.git`. Builds get faster and smaller.' },
      { term: 'Layer', text: 'Each Dockerfile step adds one read-only layer on top of the last. Layers are shared between images, so they are stored only once.', seenIn: ['build-an-image', 'layer-cache'] },
      { term: 'Build cache', text: 'Docker reuses a layer if its step and inputs have not changed. Once one step changes, every step after it runs again, so put rarely changing steps first.', seenIn: ['layer-cache'] },
      { term: 'Multi-stage build', text: 'A Dockerfile with several FROM lines. You build in one stage and copy only the result into a small final stage. This app\'s web image is built that way.' },
    ],
  },
  {
    id: 'containers',
    title: 'Running containers',
    terms: [
      { term: 'docker run', text: 'Creates a container from an image and starts it. Pulls the image first if you do not have it.', seenIn: ['hello-docker', 'first-web-server'] },
      { term: 'Detached mode', aka: '-d', text: 'Runs the container in the background and gives your terminal back.', seenIn: ['first-web-server'] },
      { term: 'Port mapping', aka: '-p', text: 'Connects a port on your machine to a port in the container. `-p 8080:80` means your port 8080 goes to the container\'s port 80.', seenIn: ['first-web-server'] },
      { term: 'Environment variable', aka: '-e', text: 'A setting passed into the container, such as a password or a mode. Set with `-e NAME=value` or `environment:` in Compose.', seenIn: ['compose-up'] },
      { term: 'docker ps', text: 'Lists running containers. Add `-a` to include stopped ones.', seenIn: ['first-web-server'] },
      { term: 'docker logs', text: 'Shows what a container printed. Add `-f` to keep following new output.', seenIn: ['first-web-server'] },
      { term: 'docker exec', text: 'Runs a command inside a running container. `docker exec -it web sh` opens a shell.', seenIn: ['inside-a-container'] },
      { term: '--rm', text: 'Deletes the container as soon as it exits. Handy for one-off commands.', seenIn: ['volumes', 'layer-cache'] },
      { term: 'Writable layer', text: 'The thin layer on top of the image where a container keeps its changes. It is deleted with the container, which is why edits vanish.', seenIn: ['inside-a-container'] },
      { term: 'Restart policy', text: 'Tells Docker whether to restart a container when it stops or the machine reboots, such as `restart: unless-stopped`.' },
    ],
  },
  {
    id: 'storage',
    title: 'Storage',
    terms: [
      { term: 'Volume', text: 'Storage managed by Docker that lives outside any container. Data in it survives when containers are removed.', seenIn: ['volumes', 'compose-up'] },
      { term: 'Named volume', text: 'A volume you give a name, such as `notes`, so any container can mount it with `-v notes:/data`.', seenIn: ['volumes'] },
      { term: 'Bind mount', text: 'Mounts a folder from your machine into a container. Changes show up on both sides straight away, which is useful during development.' },
      { term: 'Mount', aka: '-v', text: 'Makes a volume or folder appear at a path inside the container.', seenIn: ['volumes'] },
    ],
  },
  {
    id: 'networking',
    title: 'Networking',
    terms: [
      { term: 'Network', text: 'A private network that containers can join so they can talk to each other.', seenIn: ['networks'] },
      { term: 'Bridge network', text: 'The default kind of network, on a single machine. The built-in one called `bridge` has no name lookup; ones you create do.', seenIn: ['networks'] },
      { term: 'Service discovery', aka: 'DNS', text: 'On a user-created network, containers can reach each other by name, such as `cache` or `db`, instead of by IP address.', seenIn: ['networks', 'compose-up'] },
    ],
  },
  {
    id: 'compose',
    title: 'Docker Compose',
    terms: [
      { term: 'Docker Compose', text: 'A tool that runs a multi-container app from one file, with one command.', seenIn: ['compose-up', 'this-app'] },
      { term: 'compose.yaml', text: 'The file that describes the services, networks and volumes of a Compose app.', seenIn: ['compose-up', 'this-app'] },
      { term: 'Service', text: 'One entry under `services:` in compose.yaml. Compose runs one or more containers for each service.', seenIn: ['compose-up'] },
      { term: 'Project', text: 'The group of containers, networks and volumes Compose creates. Named after the folder by default.', seenIn: ['compose-up'] },
      { term: 'docker compose up', text: 'Creates and starts everything in compose.yaml. Add `-d` to run in the background and `--build` to rebuild images.', seenIn: ['compose-up', 'this-app'] },
      { term: 'docker compose down', text: 'Stops and removes the containers and network. Volumes are kept unless you add `-v`.', seenIn: ['compose-up'] },
      { term: 'depends_on', text: 'Starts one service after another. On its own it does not wait for the other service to be ready.', seenIn: ['compose-up', 'this-app'] },
      { term: 'Healthcheck', text: 'A command Docker runs to check a container is really ready. With `condition: service_healthy`, depends_on waits for it.', seenIn: ['this-app'] },
    ],
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping',
    terms: [
      { term: 'docker system df', text: 'Shows how much disk space images, containers, volumes and the build cache use.', seenIn: ['cleanup'] },
      { term: 'Prune', text: 'Removes unused things in one go, such as `docker system prune`. It asks first, and what it deletes is gone for good.', seenIn: ['cleanup'] },
      { term: 'Dangling image', text: 'An old image with no tag left, usually replaced by a newer build. Safe to prune.' },
    ],
  },
]
