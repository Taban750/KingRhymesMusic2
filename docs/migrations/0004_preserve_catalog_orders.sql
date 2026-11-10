-- Keep paid order history if a creator attempts to delete a purchased item.
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_album_id_fkey;
ALTER TABLE purchases ADD CONSTRAINT purchases_album_id_fkey FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE RESTRICT;
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_video_id_fkey;
ALTER TABLE purchases ADD CONSTRAINT purchases_video_id_fkey FOREIGN KEY (video_id) REFERENCES media_videos(id) ON DELETE RESTRICT;
