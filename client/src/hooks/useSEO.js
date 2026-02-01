import { useEffect } from 'react';

/**
 * Custom hook for SEO - sets page title and meta description
 * @param {Object} options - SEO options
 * @param {string} options.title - Page title (appends brand name)
 * @param {string} options.description - Meta description
 */
const useSEO = ({ title, description }) => {
    useEffect(() => {
        // Set document title
        const fullTitle = title 
            ? `${title} | ScholarSync - AI Classroom Manager`
            : 'ScholarSync - AI Classroom Manager | Smart Assignment Helper';
        document.title = fullTitle;

        // Set meta description
        if (description) {
            let metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', description);
            }
        }

        // Cleanup - restore default title on unmount
        return () => {
            document.title = 'ScholarSync - AI Classroom Manager | Smart Assignment Helper';
        };
    }, [title, description]);
};

export default useSEO;
