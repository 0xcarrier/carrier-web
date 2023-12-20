import React from 'react';

import { Logo } from './Logo';
import NFTImagePlaceholder from '../../assets/icons/question-mark-square.svg';
import { covalentCompressedImage, isImageIsVideo, safeIPFS } from '../../utils/web3Utils';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props
  extends Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'> {
  image?: string;
  image256?: string;
  videoProps?: Omit<React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>, 'src'>;
}

export const NFTCover: React.SFC<Props> = ({ className, image, image256, videoProps, ...restProps }) => {
  const imageCompressed = image ? `${covalentCompressedImage(safeIPFS(image))}` : undefined;
  const image256Compressed = image256 ? `${covalentCompressedImage(safeIPFS(image256))}` : undefined;
  const isVideo = isImageIsVideo(image256Compressed || imageCompressed || '');

  return isVideo ? (
    <video
      {...videoProps}
      className={cx(styleVideo, className)}
      autoPlay
      loop
      src={image256Compressed || imageCompressed || NFTImagePlaceholder}
      onError={({ currentTarget }) => {
        if (currentTarget.src === image256Compressed && imageCompressed) {
          currentTarget.src = imageCompressed;
        } else if (currentTarget.src === imageCompressed) {
          currentTarget.src = NFTImagePlaceholder;
        }
      }}
    />
  ) : (
    <Logo
      {...restProps}
      className={className}
      src={image256Compressed || imageCompressed || NFTImagePlaceholder}
      onError={({ currentTarget }) => {
        if (currentTarget.src === image256Compressed && imageCompressed) {
          currentTarget.src = imageCompressed;
        } else if (currentTarget.src === imageCompressed) {
          currentTarget.src = NFTImagePlaceholder;
        }
      }}
    />
  );
};

const styleVideo = css`
  flex-shrink: 0;
  object-fit: contain;
  height: ${pxToPcVw(32)};
  width: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(32)};
    width: ${pxToMobileVw(32)};
  }
`;
