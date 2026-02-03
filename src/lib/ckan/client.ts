/**
 * CKAN DataStore API client
 * Handles pagination and rate limiting for CKAN DataStore queries
 */

export interface CkanDataStoreResponse {
  success: boolean;
  result: {
    fields: Array<{
      type: string;
      id: string;
    }>;
    records: Array<Record<string, unknown>>;
    _links?: {
      next?: string;
    };
    total?: number;
  };
  error?: {
    message: string;
    __type: string;
  };
}

export interface CkanClientConfig {
  baseUrl?: string;
  resourceId: string;
  limit?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_BASE_URL = 'https://datos.tenerife.es/ckan/api/3/action';
const DEFAULT_LIMIT = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Fetch all records from CKAN DataStore with pagination
 */
export async function fetchAllRecords(
  config: CkanClientConfig
): Promise<Array<Record<string, unknown>>> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    resourceId,
    limit = DEFAULT_LIMIT,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = config;

  const allRecords: Array<Record<string, unknown>> = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${baseUrl}/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`;

    let attempt = 0;
    let response: Response | null = null;
    let data: CkanDataStoreResponse | null = null;

    // Retry logic with exponential backoff
    while (attempt < maxRetries) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Tenerife ETL Pipeline (https://github.com/your-repo)',
            'Accept': 'application/json',
          },
        });

        if (response.status === 429 || response.status === 503) {
          // Rate limit or service unavailable
          const waitTime = retryDelay * Math.pow(2, attempt);
          console.log(`Rate limit hit (${response.status}), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          attempt++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`CKAN API failed: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
        break;
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(
            `Failed to fetch CKAN data after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
        const waitTime = retryDelay * Math.pow(2, attempt);
        console.log(`Error fetching CKAN data, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (!data) {
      throw new Error('Failed to fetch data from CKAN after retries');
    }

    if (!data.success) {
      throw new Error(
        `CKAN API returned error: ${data.error?.message || 'Unknown error'}`
      );
    }

    const records = data.result?.records || [];
    allRecords.push(...records);

    console.log(`Fetched ${records.length} records (offset ${offset}, total so far: ${allRecords.length})`);

    // Check if there are more records
    if (records.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
      // Small delay between pages to be respectful
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`Total records fetched: ${allRecords.length}`);
  return allRecords;
}
