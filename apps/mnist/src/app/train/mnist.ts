import { tensor2d, tensor4d } from '@tensorflow/tfjs';

export const IMAGE_H = 28;
export const IMAGE_W = 28;
const IMAGE_SIZE = IMAGE_H * IMAGE_W;
const NUM_CLASSES = 10;
const NUM_DATASET_ELEMENTS = 65000;

const NUM_TRAIN_ELEMENTS = 55000;
const NUM_TEST_ELEMENTS = NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS;

const MNIST_IMAGES_SPRITE_PATH = '/assets/mnist_images.png';
const MNIST_LABELS_PATH = '/assets/mnist_labels_uint8';

export class MnistData {
  datasetImages: Float32Array | undefined;
  datasetLabels: Uint8Array | undefined;
  trainImages: Float32Array | undefined;
  testImages: Float32Array | undefined;
  trainLabels: Uint8Array | undefined;
  testLabels: Uint8Array | undefined;

  async load() {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('no context');
    }
    const imgRequest = new Promise<void>((resolve, reject) => {
      img.crossOrigin = '';
      img.onload = () => {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;

        const datasetBytesBuffer = new ArrayBuffer(
          NUM_DATASET_ELEMENTS * IMAGE_SIZE * 4
        );

        const chunkSize = 5000;
        canvas.width = img.width;
        canvas.height = chunkSize;

        for (let i = 0; i < NUM_DATASET_ELEMENTS / chunkSize; i++) {
          const datasetBytesView = new Float32Array(
            datasetBytesBuffer,
            i * IMAGE_SIZE * chunkSize * 4,
            IMAGE_SIZE * chunkSize
          );
          ctx.drawImage(
            img,
            0,
            i * chunkSize,
            img.width,
            chunkSize,
            0,
            0,
            img.width,
            chunkSize
          );

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          for (let j = 0; j < imageData.data.length / 4; j++) {
            datasetBytesView[j] = imageData.data[j * 4] / 255;
          }
        }
        this.datasetImages = new Float32Array(datasetBytesBuffer);

        resolve();
      };
      img.src = MNIST_IMAGES_SPRITE_PATH;
    });

    const labelsRequest = fetch(MNIST_LABELS_PATH);
    const [, labelsResponse] = await Promise.all([imgRequest, labelsRequest]);

    this.datasetLabels = new Uint8Array(await labelsResponse.arrayBuffer());

    this.trainImages = this.datasetImages?.slice(
      0,
      IMAGE_SIZE * NUM_TRAIN_ELEMENTS
    );
    this.testImages = this.datasetImages?.slice(
      IMAGE_SIZE * NUM_TRAIN_ELEMENTS
    );
    this.trainLabels = this.datasetLabels.slice(
      0,
      NUM_CLASSES * NUM_TRAIN_ELEMENTS
    );
    this.testLabels = this.datasetLabels.slice(
      NUM_CLASSES * NUM_TRAIN_ELEMENTS
    );
  }

  getTrainData() {
    if (!this.trainImages || !this.trainLabels) {
      throw new Error('train data not loaded');
    }
    const xs = tensor4d(this.trainImages, [
      this.trainImages.length / IMAGE_SIZE,
      IMAGE_H,
      IMAGE_W,
      1,
    ]);
    const labels = tensor2d(this.trainLabels, [
      this.trainLabels.length / NUM_CLASSES,
      NUM_CLASSES,
    ]);
    return { xs, labels };
  }

  getTestData(numExamples?: number) {
    if (!this.testImages || !this.testLabels) {
      throw new Error('test data not loaded');
    }
    let xs = tensor4d(this.testImages, [
      this.testImages.length / IMAGE_SIZE,
      IMAGE_H,
      IMAGE_W,
      1,
    ]);
    let labels = tensor2d(this.testLabels, [
      this.testLabels.length / NUM_CLASSES,
      NUM_CLASSES,
    ]);

    if (numExamples) {
      xs = xs.slice([0, 0, 0, 0], [numExamples, IMAGE_H, IMAGE_W, 1]);
      labels = labels.slice([0, 0], [numExamples, NUM_CLASSES]);
    }
    return { xs, labels };
  }
}
