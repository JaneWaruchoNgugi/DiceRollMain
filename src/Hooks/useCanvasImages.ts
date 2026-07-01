import { useEffect, useState } from "react";

const usePreloadImages = (imageSources: { [key: string]: string }) => {
    const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const imageObjects: { [key: string]: HTMLImageElement } = {};
        let loadedCount = 0;
        const totalImages = Object.keys(imageSources).length;

        Object.entries(imageSources).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imageObjects[key] = img;
                loadedCount++;
                if (loadedCount === totalImages) {
                    setImages(imageObjects);
                    setLoaded(true);
                }
            };
        });
    }, [imageSources]);

    return { images, loaded };
};

export default usePreloadImages;
